import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import {
  UpdateEnrollmentStatusDto,
  EnrollmentFilterDto,
} from './dto/update-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async searchTrainees(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();

    return this.prisma.trainee.findMany({
      where: {
        OR: [
          {
            users: {
              first_name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          { first_name: { contains: searchTerm, mode: 'insensitive' } },
          { last_name: { contains: searchTerm, mode: 'insensitive' } },
          { middle_name: { contains: searchTerm, mode: 'insensitive' } },
          {
            users: {
              last_name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            users: {
              middle_name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          },
          {
            contact_number: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        users: {
          select: {
            first_name: true,
            last_name: true,
            middle_name: true,
          },
        },
        first_name: true,
        middle_name: true,
        last_name: true,
        contact_number: true,
        street_address: true,
        barangay: true,
        municipality: true,
        district: true,
        province: true,
        date_of_birth: true,
        place_of_birth: true,
        citizenship: true,
        mother_name: true,
        father_name: true,
        civil_status: true,
        highest_education: true,
        employment_status: true,
        employment_type: true,
        pwd: true,
        gender: true,
        insurance_coverage: {
          where: { expiry_date: { gte: new Date() } },
          select: { coverage_id: true },
          take: 1,
        },
      },
      take: 10,
    }).then((trainees) => trainees.map(({ insurance_coverage, users, ...trainee }) => ({
      ...trainee,
      users: users || {
        first_name: trainee.first_name || '',
        middle_name: trainee.middle_name || '',
        last_name: trainee.last_name || '',
      },
      hasActiveInsurance: insurance_coverage.length > 0,
    })));
  }

  async getAvailableBatches(traineeId?: string) {
    const today = new Date();

    const existingEnrollments = traineeId
      ? await this.prisma.enrollments.findMany({
          where: {
            trainee_id: traineeId,
            enrollment_status: { in: ['PENDING', 'ENROLLED'] },
          },
          select: {
            batch: {
              select: {
                start_date: true,
                end_date: true,
                programs: {
                  select: {
                    id: true,
                    is_accredited: true,
                    schedule: true,
                    start_time: true,
                    end_time: true,
                  },
                },
              },
            },
          },
        })
      : [];

    const batches = await this.prisma.batch.findMany({
      where: {
        batch_status: 'OPEN',
        end_date: {
          gte: today,
        },
      },
      select: {
        id: true,
        batch_name: true,
        program_id: true,
        capacity: true,
        start_date: true,
        end_date: true,
        batch_status: true,
        programs: {
          select: {
            id: true,
            name: true,
            id_card_prefix: true,
            is_accredited: true,
            schedule: true,
            start_time: true,
            end_time: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    return batches
      .filter((batch) => batch._count.enrollments < batch.capacity)
      .filter(
        (batch) =>
          !traineeId ||
          existingEnrollments.every(({ batch: existingBatch }) => {
            if (existingBatch.programs.id === batch.programs.id) return false;
            const datesOverlap =
              existingBatch.start_date <= batch.end_date &&
              batch.start_date <= existingBatch.end_date;
            const daysOverlap = existingBatch.programs.schedule.some((day) =>
              batch.programs.schedule.includes(day),
            );
            const timesOverlap =
              existingBatch.programs.start_time < batch.programs.end_time &&
              batch.programs.start_time < existingBatch.programs.end_time;
            return (
              !(
                existingBatch.programs.is_accredited &&
                batch.programs.is_accredited
              ) && !(datesOverlap && daysOverlap && timesOverlap)
            );
          }),
      )
      .map((batch) => ({
        ...batch,
        remainingCapacity: batch.capacity - batch._count.enrollments,
        _count: undefined,
      }));
  }

  async getPrograms() {
    return this.prisma.programs.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        id_card_prefix: true,
        control_number_prefix: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async checkDuplicateEnrollment(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
    batchId: string,
  ) {
    const existing = await tx.enrollments.findFirst({
      where: {
        trainee_id: traineeId,
        batch_id: batchId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Enrollment rejected: this trainee is already enrolled in the selected batch.',
      );
    }
  }

  private async validateBatchAvailability(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    batchId: string,
  ) {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        batch_status: true,
        start_date: true,
        end_date: true,
        capacity: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found.');
    }

    if (batch.batch_status !== 'OPEN') {
      throw new BadRequestException('The selected batch is no longer open.');
    }

    if (batch.end_date < new Date()) {
      throw new BadRequestException('The selected batch has already ended.');
    }

    if (batch._count.enrollments >= batch.capacity) {
      throw new BadRequestException(
        'The selected batch is already full. Please select another available batch.',
      );
    }
  }

  private async validateTraineeProgramRules(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
    batchId: string,
  ) {
    const selectedBatch = await tx.batch.findUnique({
      where: { id: batchId },
      select: {
        start_date: true,
        end_date: true,
        programs: {
          select: {
            is_accredited: true,
            schedule: true,
            start_time: true,
            end_time: true,
            name: true,
          },
        },
      },
    });
    if (!selectedBatch) throw new NotFoundException('Batch not found.');

    const currentEnrollments = await tx.enrollments.findMany({
      where: {
        trainee_id: traineeId,
        enrollment_status: { in: ['PENDING', 'ENROLLED'] },
      },
      select: {
        batch: {
          select: {
            start_date: true,
            end_date: true,
            programs: {
              select: {
                is_accredited: true,
                schedule: true,
                start_time: true,
                end_time: true,
                name: true,
              },
            },
          },
        },
      },
    });

    for (const current of currentEnrollments) {
      const currentProgram = current.batch.programs;
      if (
        currentProgram.is_accredited &&
        selectedBatch.programs.is_accredited
      ) {
        throw new ConflictException(
          'This trainee is already enrolled in an accredited program and cannot enroll in another accredited program.',
        );
      }

      const datesOverlap =
        current.batch.start_date <= selectedBatch.end_date &&
        selectedBatch.start_date <= current.batch.end_date;
      const daysOverlap = currentProgram.schedule.some((day) =>
        selectedBatch.programs.schedule.includes(day),
      );
      const timesOverlap =
        currentProgram.start_time < selectedBatch.programs.end_time &&
        selectedBatch.programs.start_time < currentProgram.end_time;
      if (datesOverlap && daysOverlap && timesOverlap) {
        throw new ConflictException(
          `Schedule conflict: ${currentProgram.name} overlaps the selected program.`,
        );
      }
    }
  }

  private async generateIdCardNumber(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    programId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const program = await tx.programs.findUnique({
      where: { id: programId },
      select: { id_card_prefix: true },
    });

    if (!program) {
      throw new NotFoundException('Program not found.');
    }

    const updatedSeq = await tx.batch_seq.upsert({
      where: {
        program_id_year: {
          program_id: programId,
          year,
        },
      },
      update: {
        last_sequence: {
          increment: 1,
        },
      },
      create: {
        program_id: programId,
        year,
        last_sequence: 1,
      },
      select: {
        last_sequence: true,
      },
    });

    return `${year}-${program.id_card_prefix}${String(updatedSeq.last_sequence).padStart(3, '0')}`;
  }

  private async createTrainee(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeData: any,
  ) {
    return tx.trainee.create({
      data: {
        first_name: traineeData.firstName,
        middle_name: traineeData.middleName || '',
        last_name: traineeData.lastName,
        contact_number: traineeData.contactNumber,
        street_address: traineeData.streetAddress,
        barangay: traineeData.barangay,
        municipality: traineeData.municipality,
        district: traineeData.district,
        province: traineeData.province,
        gender: traineeData.gender,
        date_of_birth: new Date(traineeData.dateOfBirth),
        place_of_birth: traineeData.placeOfBirth,
        citizenship: traineeData.citizenship || 'FILIPINO',
        mother_name: traineeData.motherName,
        father_name: traineeData.fatherName,
        civil_status: traineeData.civilStatus,
        highest_education: traineeData.highestEducation,
        pwd: traineeData.pwd,
        employment_status: traineeData.employmentStatus,
        employment_type: traineeData.employmentType,
      },
    });
  }

  private async updateTrainee(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
    traineeData: any,
  ) {
    const existingTrainee = await tx.trainee.findUnique({
      where: { id: traineeId },
      select: { users_id: true },
    });

    await tx.trainee.update({
      where: { id: traineeId },
      data: {
        first_name: traineeData.firstName,
        middle_name: traineeData.middleName || '',
        last_name: traineeData.lastName,
        contact_number: traineeData.contactNumber,
        street_address: traineeData.streetAddress,
        barangay: traineeData.barangay,
        municipality: traineeData.municipality,
        district: traineeData.district,
        province: traineeData.province,
        gender: traineeData.gender,
        date_of_birth: new Date(traineeData.dateOfBirth),
        place_of_birth: traineeData.placeOfBirth,
        citizenship: traineeData.citizenship || 'FILIPINO',
        mother_name: traineeData.motherName,
        father_name: traineeData.fatherName,
        civil_status: traineeData.civilStatus,
        highest_education: traineeData.highestEducation,
        pwd: traineeData.pwd,
        employment_status: traineeData.employmentStatus,
        employment_type: traineeData.employmentType,
      },
    });

  }

  async createEnrollment(
    createDto: CreateEnrollmentDto,
    enrolledByUserId: string,
  ) {
    const {
      trainee: traineeData,
      batchId,
      requirementChecklist,
      uniformSize,
      uniformGiven,
      remarks,
      payment,
    } = createDto;

    return this.prisma.$transaction(async (tx) => {
      await this.validateBatchAvailability(tx, batchId);

      let traineeId: string;

      if (traineeData.isExistingTrainee && traineeData.id) {
        const existingTrainee = await tx.trainee.findUnique({
          where: { id: traineeData.id },
        });

        if (!existingTrainee) {
          throw new NotFoundException('Trainee not found.');
        }

        await this.checkDuplicateEnrollment(tx, traineeData.id, batchId);
        await this.updateTrainee(tx, traineeData.id, traineeData);
        traineeId = traineeData.id;
      } else {
        const duplicateTrainee = await tx.trainee.findFirst({
          where: { contact_number: traineeData.contactNumber },
          select: { id: true },
        });

        if (duplicateTrainee) {
          throw new ConflictException(
            'A trainee with this contact number already exists. Search and select the existing trainee instead of creating a duplicate.',
          );
        }

        const newTrainee = await this.createTrainee(tx, traineeData);
        traineeId = newTrainee.id;
      }

      await this.validateTraineeProgramRules(tx, traineeId, batchId);

      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        select: { program_id: true },
      });

      if (!batch) {
        throw new NotFoundException('Batch not found.');
      }

      let inventoryId: string | null = null;
      if (uniformGiven) {
        const inventoryItem = await tx.inventory.findFirst({
          where: {
            program_id: batch.program_id,
            sizes: uniformSize,
            quantity: { gt: 0 },
          },
          orderBy: { updated_at: 'asc' },
          select: { id: true },
        });

        if (!inventoryItem) {
          throw new BadRequestException(
            `No ${uniformSize} uniform is currently in stock for this program.`,
          );
        }

        const stockUpdate = await tx.inventory.updateMany({
          where: { id: inventoryItem.id, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });

        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            'The selected uniform stock is no longer available. Please try again.',
          );
        }

        inventoryId = inventoryItem.id;
      }

      const idCardNumber = await this.generateIdCardNumber(
        tx,
        batch.program_id,
      );

      const enrollment = await tx.enrollments.create({
        data: {
          trainee_id: traineeId,
          batch_id: batchId,
          enrollment_status: 'PENDING',
          uniform_size: uniformSize,
          id_card_number: idCardNumber,
          enrolled_by: enrolledByUserId,
          remarks,
        },
      });

      await tx.requirement_checklist.create({
        data: {
          enrollment_id: enrollment.id,
          checked_by: enrolledByUserId,
          bc_nso_psa_copy: requirementChecklist.bcNsoPsaCopy,
          diploma_tor: requirementChecklist.diplomaTor,
          brgy_clearance: requirementChecklist.brgyClearance,
          one_by_one_pic: requirementChecklist.oneByOnePic,
          two_by_two_pic: requirementChecklist.twoByTwoPic,
          passport_size: requirementChecklist.passportSize,
          commitment_fee: false,
          remarks: requirementChecklist.remarks,
        },
      });

      await tx.distribution_checklist.create({
        data: {
          enrollment_id: enrollment.id,
          inventory_id: inventoryId,
          uniform_given: uniformGiven,
          size_issued: uniformGiven ? uniformSize : null,
          date_distributed: uniformGiven ? new Date() : null,
          distributed_by: uniformGiven ? enrolledByUserId : null,
        },
      });

      let orNumber: string | null = null;
      if (payment.processPayment) {
        const paymentDate = new Date();
        const activeCoverage = await tx.insurance_coverage.findFirst({
          where: {
            trainee_id: traineeId,
            effective_date: { lte: paymentDate },
            expiry_date: { gte: paymentDate },
          },
          select: { coverage_id: true },
        });
        const baseFee = activeCoverage ? 450 : 500;
        orNumber = `OR-${paymentDate.getFullYear()}-${enrollment.id.slice(0, 8).toUpperCase()}`;
        const receipt = await tx.official_receipts.create({
          data: {
            enrollment_id: enrollment.id,
            or_number: orNumber,
            base_fee: baseFee,
            amount: payment.amount!,
            payment_date: paymentDate,
            payment_method: payment.paymentMethod!,
            reason_of_dues: payment.reasonOfDues || 'ENROLLMENT',
            remarks: payment.remarks,
            confirmed_by: enrolledByUserId,
          },
        });

        if (!activeCoverage) {
          await tx.insurance_coverage.create({
            data: {
              trainee_id: traineeId,
              effective_date: paymentDate,
              expiry_date: new Date(paymentDate.getFullYear() + 1, paymentDate.getMonth(), paymentDate.getDate()),
              official_receipt_id: receipt.id,
            },
          });
        }
      }

      return {
        ...enrollment,
        idCardNumber,
        orNumber,
      };
    });
  }

  async getEnrollments(filters: EnrollmentFilterDto) {
    const {
      search,
      batchId,
      programId,
      status,
      startDate,
      endDate,
      skip = 0,
      take = 10,
    } = filters;
    const where: Record<string, any> = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { id_card_number: { contains: searchTerm, mode: 'insensitive' } },
        {
          trainee: {
            users: {
              first_name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
        {
          trainee: {
            users: { last_name: { contains: searchTerm, mode: 'insensitive' } },
          },
        },
        {
          trainee: {
            contact_number: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          batch: { batch_name: { contains: searchTerm, mode: 'insensitive' } },
        },
        {
          batch: {
            programs: { name: { contains: searchTerm, mode: 'insensitive' } },
          },
        },
      ];
    }

    if (batchId) where.batch_id = batchId;
    if (programId) where.batch = { program_id: programId };
    if (status) where.enrollment_status = status;
    if (startDate || endDate) {
      where.enrolled_at = {};
      if (startDate) where.enrolled_at.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.enrolled_at.lt = end;
      }
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollments.findMany({
        where,
        select: {
          id: true,
          enrollment_status: true,
          uniform_size: true,
          id_card_number: true,
          enrolled_at: true,
          remarks: true,
          trainee: {
            select: {
              id: true,
              users: {
                select: {
                  first_name: true,
                  last_name: true,
                  middle_name: true,
                },
              },
              contact_number: true,
            },
          },
          batch: {
            select: {
              id: true,
              batch_name: true,
              start_date: true,
              end_date: true,
              programs: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          official_receipts: {
            select: { or_number: true },
            take: 1,
          },
        },
        orderBy: { enrolled_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.enrollments.count({ where }),
    ]);

    return { data: enrollments, total, skip, take };
  }

  async getEnrollmentDetail(enrollmentId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        enrollment_status: true,
        uniform_size: true,
        id_card_number: true,
        enrolled_at: true,
        remarks: true,
        enrolled_by: true,
        trainee: {
          select: {
            id: true,
            contact_number: true,
            street_address: true,
            barangay: true,
            municipality: true,
            district: true,
            province: true,
            gender: true,
            date_of_birth: true,
            place_of_birth: true,
            citizenship: true,
            mother_name: true,
            father_name: true,
            civil_status: true,
            highest_education: true,
            pwd: true,
            employment_status: true,
            employment_type: true,
            users: {
              select: {
                first_name: true,
                last_name: true,
                middle_name: true,
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batch_name: true,
            start_date: true,
            end_date: true,
            capacity: true,
            programs: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requirement_checklist: {
          select: {
            id: true,
            bc_nso_psa_copy: true,
            diploma_tor: true,
            brgy_clearance: true,
            one_by_one_pic: true,
            two_by_two_pic: true,
            passport_size: true,
            commitment_fee: true,
            remarks: true,
            checked_at: true,
          },
        },
        distribution_checklist: {
          select: {
            id: true,
            uniform_given: true,
            size_issued: true,
            id_card_given: true,
            date_distributed: true,
            remarks: true,
          },
        },
        official_receipts: {
          select: {
            id: true,
            or_number: true,
            amount: true,
            payment_date: true,
            payment_method: true,
          },
          take: 1,
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  async updateEnrollmentStatus(
    enrollmentId: string,
    updateDto: UpdateEnrollmentStatusDto,
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return this.prisma.enrollments.update({
      where: { id: enrollmentId },
      data: {
        enrollment_status: updateDto.status,
        remarks: updateDto.remarks || enrollment.remarks,
      },
    });
  }
}
