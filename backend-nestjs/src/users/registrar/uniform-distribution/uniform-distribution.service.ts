import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  enrollment_status_enum,
  Prisma,
  size_enum,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { InventoryService } from '../../../inventory/inventory.service';
import {
  UniformDistributionQueryDto,
  UniformStatusFilter,
} from './dto/uniform-distribution-query.dto';
import { DistributeUniformDto } from './dto/distribute-uniform.dto';

const INACTIVE_STATUSES: enrollment_status_enum[] = [
  enrollment_status_enum.WITHDRAWN,
  enrollment_status_enum.DROPPED,
  enrollment_status_enum.COMPLETED,
];

@Injectable()
export class UniformDistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async list(query: UniformDistributionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const searchTerms = query.search
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

    const baseWhere: Prisma.enrollmentsWhereInput = {
      ...(query.includeInactive
        ? {}
        : {
            enrollment_status: {
              notIn: INACTIVE_STATUSES,
            },
          }),
      ...(query.programId
        ? {
            batch: {
              is: {
                program_id: query.programId,
              },
            },
          }
        : {}),
      ...(query.batchId ? { batch_id: query.batchId } : {}),
    };

    const searchConditions: Prisma.enrollmentsWhereInput[] =
      searchTerms.map((term) => ({
        OR: [
          {
            id_card_number: {
              contains: term,
              mode: 'insensitive',
            },
          },
          {
            trainee: {
              is: {
                users: {
                  is: {
                    OR: [
                      {
                        first_name: {
                          contains: term,
                          mode: 'insensitive',
                        },
                      },
                      {
                        middle_name: {
                          contains: term,
                          mode: 'insensitive',
                        },
                      },
                      {
                        last_name: {
                          contains: term,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      }));

    const filteredBaseWhere: Prisma.enrollmentsWhereInput = {
      ...baseWhere,
      ...(searchConditions.length > 0
        ? { AND: searchConditions }
        : {}),
    };

    const statusWhere = this.getUniformStatusWhere(
      query.status ?? 'ALL',
    );

    const where: Prisma.enrollmentsWhereInput = {
      ...filteredBaseWhere,
      ...(Object.keys(statusWhere).length > 0
        ? {
            AND: [
              ...searchConditions,
              statusWhere,
            ],
          }
        : {}),
    };

    const [enrollments, total, given, waiting] = await Promise.all([
      this.prisma.enrollments.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          enrolled_at: 'desc',
        },
        include: {
          trainee: {
            include: {
              users: {
                select: {
                  id: true,
                  first_name: true,
                  middle_name: true,
                  last_name: true,
                  system_id: true,
                },
              },
            },
          },
          batch: {
            include: {
              programs: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          distribution_checklist: {
            include: {
              users: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.enrollments.count({ where }),
      this.prisma.enrollments.count({
        where: {
          ...filteredBaseWhere,
          distribution_checklist: {
            is: {
              uniform_given: true,
            },
          },
        },
      }),
      this.prisma.enrollments.count({
        where: {
          ...filteredBaseWhere,
          OR: [
            {
              distribution_checklist: {
                is: null,
              },
            },
            {
              distribution_checklist: {
                is: {
                  uniform_given: false,
                },
              },
            },
          ],
        },
      }),
    ]);

    return {
      data: enrollments.map((enrollment) => {
        const user = enrollment.trainee.users;
        const checklist = enrollment.distribution_checklist;
        const distributor = checklist?.users;

        return {
          enrollmentId: enrollment.id,
          traineeId: enrollment.trainee_id,
          traineeName: user
            ? [
                user.first_name,
                user.middle_name,
                user.last_name,
              ]
                .filter(Boolean)
                .join(' ')
            : 'Unknown Trainee',
          systemId: user?.system_id ?? null,
          idCardNumber: enrollment.id_card_number,
          programId: enrollment.batch.programs.id,
          programName: enrollment.batch.programs.name,
          batchId: enrollment.batch_id,
          batchName: enrollment.batch.batch_name,
          enrollmentSize: enrollment.uniform_size,
          enrollmentStatus: enrollment.enrollment_status,
          uniformGiven: checklist?.uniform_given ?? false,
          sizeIssued: checklist?.size_issued ?? null,
          dateDistributed: checklist?.date_distributed ?? null,
          distributedBy: distributor
            ? `${distributor.first_name} ${distributor.last_name}`
            : null,
          inventoryId: checklist?.inventory_id ?? null,
          isInactive: INACTIVE_STATUSES.includes(
            enrollment.enrollment_status,
          ),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        given,
        waiting,
      },
    };
  }

  async distribute(
    enrollmentId: string,
    userId: string,
    dto: DistributeUniformDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lock the enrollment so simultaneous requests cannot
      // distribute a uniform to the same enrollment twice.
      const lockedEnrollments = await tx.$queryRaw<
        Array<{
          id: string;
          batch_id: string;
          enrollment_status: enrollment_status_enum;
        }>
      >`
        SELECT id, batch_id, enrollment_status
        FROM enrollments
        WHERE id = ${enrollmentId}::uuid
        FOR UPDATE
      `;

      const enrollment = lockedEnrollments[0];

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found.');
      }

      if (
        enrollment.enrollment_status !==
        enrollment_status_enum.ENROLLED
      ) {
        throw new BadRequestException(
          'Uniforms can only be distributed to enrolled trainees.',
        );
      }

      const existingChecklist =
        await tx.distribution_checklist.findUnique({
          where: {
            enrollment_id: enrollmentId,
          },
        });

      if (existingChecklist?.uniform_given) {
        throw new ConflictException(
          'A uniform has already been distributed to this enrollment.',
        );
      }

      const batch = await tx.batch.findUnique({
        where: {
          id: enrollment.batch_id,
        },
        select: {
          program_id: true,
        },
      });

      if (!batch) {
        throw new NotFoundException('Enrollment batch not found.');
      }

      // Reuse the existing inventory deduction and transaction logger.
      // This runs inside the same transaction as the checklist update.
      const inventoryId = await this.inventoryService.deductAndLog(
        tx,
        batch.program_id,
        dto.size as size_enum,
        enrollmentId,
        userId,
      );

      const dateDistributed = new Date();

      const checklist = await tx.distribution_checklist.upsert({
        where: {
          enrollment_id: enrollmentId,
        },
        create: {
          enrollment_id: enrollmentId,
          inventory_id: inventoryId,
          uniform_given: true,
          size_issued: dto.size,
          date_distributed: dateDistributed,
          distributed_by: userId,
        },
        update: {
          inventory_id: inventoryId,
          uniform_given: true,
          size_issued: dto.size,
          date_distributed: dateDistributed,
          distributed_by: userId,
          updated_at: new Date(),
        },
      });

      return {
        message: 'Uniform successfully distributed.',
        enrollmentId,
        uniformGiven: checklist.uniform_given,
        sizeIssued: checklist.size_issued,
        dateDistributed: checklist.date_distributed,
        inventoryId: checklist.inventory_id,
      };
    });
  }

  private getUniformStatusWhere(
    status: UniformStatusFilter,
  ): Prisma.enrollmentsWhereInput {
    switch (status) {
      case 'GIVEN':
        return {
          distribution_checklist: {
            is: {
              uniform_given: true,
            },
          },
        };

      case 'NOT_GIVEN':
        return {
          OR: [
            {
              distribution_checklist: {
                is: null,
              },
            },
            {
              distribution_checklist: {
                is: {
                  uniform_given: false,
                },
              },
            },
          ],
        };

      case 'ALL':
      default:
        return {};
    }
  }
}
