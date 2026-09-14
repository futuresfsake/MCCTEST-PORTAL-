import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  announcement_scope_enum,
  approval_status_enum,
  attendance_status_enum,
  batch_status_enum,
  certificate_type_enum,
  civil_status_enum,
  clearance_status_enum,
  day_enum,
  employment_status_enum,
  employment_type_enum,
  enrollment_status_enum,
  gender_enum,
  highest_education_enum,
  outcome_status_enum,
  payment_method_enum,
  payment_reason_enum,
  release_status_enum,
  request_status_enum,
  size_enum,
  user_role_enum,
} from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PROGRAMS = [
  { name: 'DEMO - AutoCAD', code: 'DAUTOCAD', topic: 'technical drawing and AutoCAD' },
  { name: 'DEMO - Computer Systems Servicing', code: 'DCSS', topic: 'computer systems servicing' },
  { name: 'DEMO - Dressmaking', code: 'DDRESS', topic: 'dressmaking and garment construction' },
] as const;

const DEMO_TRAINEE_NAMES = [
  { first_name: 'Juan', last_name: 'Dela Cruz', middle_name: '' },
  { first_name: 'Maria', last_name: 'Santos', middle_name: 'Rose' },
  { first_name: 'Pedro', last_name: 'Reyes', middle_name: '' },
  { first_name: 'Ana', last_name: 'Luna', middle_name: 'Marie' },
  { first_name: 'Rico', last_name: 'Bautista', middle_name: '' },
] as const;

const DEMO_OFFICE_ROLES = ['Registrar Office', 'Cashier Office', 'Guidance Office', 'Admin Office'];

function dateOnly(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function timeOnly(hour: number, minute: number) {
  return new Date(Date.UTC(1970, 0, 1, hour, minute));
}

async function main() {
  const currentYearSuffix = String(new Date().getFullYear()).slice(-2);

  const registrar = await prisma.users.findFirst({
    where: { role: user_role_enum.REGISTRAR, is_active: true },
    orderBy: { created_at: 'asc' },
  });

  if (!registrar) {
    throw new Error('Run the base seed first so an active registrar exists.');
  }

  await prisma.users.upsert({
    where: { system_id: `MCCTP-${currentYearSuffix}-001` },
    update: { first_name: 'System', last_name: 'Admin', is_active: true },
    create: {
      system_id: `MCCTP-${currentYearSuffix}-001`,
      first_name: 'System',
      last_name: 'Admin',
      middle_name: '',
      password_hash: await bcrypt.hash(process.env.ADMIN_SEED_PASSWORD ?? 'Admin@1234!', 12),
      role: user_role_enum.ADMIN,
      is_active: true,
    },
  });

  const trainerPassword = await bcrypt.hash('DemoTrainer@1234!', 12);
  const traineePassword = await bcrypt.hash('Trainee@1234!', 12);

  const categoryMap: Record<string, string> = {};
  for (const categoryName of ['BASIC', 'COMMON', 'CORE'] as const) {
    const existing = await prisma.competency_category.findFirst({ where: { category_name: categoryName } });
    if (existing) {
      categoryMap[categoryName] = existing.category_id;
    } else {
      const created = await prisma.competency_category.create({ data: { category_name: categoryName } });
      categoryMap[categoryName] = created.category_id;
    }
  }

  const seededPrograms: Array<{ id: string; name: string }> = [];
  const seededBatches: Array<{ batchId: string; programId: string }> = [];
  const enrollmentRecords: Array<{ enrollmentId: string }> = [];

  for (const [programIndex, demoProgram] of DEMO_PROGRAMS.entries()) {
    const trainerSystemId = `DEMO-TRAINER-${String(programIndex + 1).padStart(3, '0')}`;

    const trainerUser = await prisma.users.upsert({
      where: { system_id: trainerSystemId },
      update: {
        first_name: 'Demo',
        last_name: `${demoProgram.code} Trainer`,
        role: user_role_enum.TRAINER,
        is_active: true,
      },
      create: {
        system_id: trainerSystemId,
        first_name: 'Demo',
        last_name: `${demoProgram.code} Trainer`,
        middle_name: '',
        password_hash: trainerPassword,
        role: user_role_enum.TRAINER,
        is_active: true,
      },
    });

    const trainer = await prisma.trainer.findFirst({ where: { user_id: trainerUser.id } });
    if (trainer) {
      await prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          gender: programIndex % 2 === 0 ? gender_enum.MALE : gender_enum.FEMALE,
          complete_address: 'Demo Training Center, Main Campus',
          highest_education: highest_education_enum.COLLEGE,
          date_of_birth: dateOnly(1985 + programIndex, 2 + programIndex, 10 + programIndex),
          contact_number: `0917000000${String(programIndex + 1)}`,
        },
      });
    } else {
      await prisma.trainer.create({
        data: {
          user_id: trainerUser.id,
          gender: programIndex % 2 === 0 ? gender_enum.MALE : gender_enum.FEMALE,
          complete_address: 'Demo Training Center, Main Campus',
          highest_education: highest_education_enum.COLLEGE,
          date_of_birth: dateOnly(1985 + programIndex, 2 + programIndex, 10 + programIndex),
          contact_number: `0917000000${String(programIndex + 1)}`,
        },
      });
    }

    const program = await prisma.programs.upsert({
      where: { name: demoProgram.name },
      update: {
        is_active: true,
        is_accredited: false,
        schedule: [day_enum.MON, day_enum.WED, day_enum.FRI],
        start_time: timeOnly(8, 0),
        end_time: timeOnly(17, 0),
        total_training_hours: 200,
        approx_months: '3 months',
        control_number_prefix: demoProgram.code,
        id_card_prefix: demoProgram.code,
        created_by: registrar.id,
        updated_by: registrar.id,
      },
      create: {
        name: demoProgram.name,
        is_active: true,
        is_accredited: false,
        schedule: [day_enum.MON, day_enum.WED, day_enum.FRI],
        start_time: timeOnly(8, 0),
        end_time: timeOnly(17, 0),
        total_training_hours: 200,
        approx_months: '3 months',
        control_number_prefix: demoProgram.code,
        id_card_prefix: demoProgram.code,
        created_by: registrar.id,
        updated_by: registrar.id,
      },
    });

    seededPrograms.push({ id: program.id, name: program.name });

    const trainerRecord = await prisma.trainer.findFirst({ where: { user_id: trainerUser.id } });
    if (!trainerRecord) continue;

    const existingBatch = await prisma.batch.findFirst({
      where: { batch_name: `${demoProgram.code}-BATCH-2026`, program_id: program.id },
    });

    const batch = existingBatch
      ? await prisma.batch.update({
          where: { id: existingBatch.id },
          data: {
            trainer_id: trainerRecord.id,
            created_by: registrar.id,
            capacity: 30,
            start_date: dateOnly(2026, 10, 5),
            end_date: dateOnly(2026, 12, 20),
            batch_status: batch_status_enum.OPEN,
            remarks: `Demo batch for ${demoProgram.name}`,
          },
        })
      : await prisma.batch.create({
          data: {
            program_id: program.id,
            trainer_id: trainerRecord.id,
            created_by: registrar.id,
            batch_name: `${demoProgram.code}-BATCH-2026`,
            capacity: 30,
            start_date: dateOnly(2026, 10, 5),
            end_date: dateOnly(2026, 12, 20),
            batch_status: batch_status_enum.OPEN,
            remarks: `Demo batch for ${demoProgram.name}`,
          },
        });

    seededBatches.push({ batchId: batch.id, programId: program.id });

    await prisma.batch_student_seq.upsert({
      where: { batch_id: batch.id },
      update: { last_sequence: 0 },
      create: { batch_id: batch.id, last_sequence: 0 },
    });

    await prisma.training_session.deleteMany({ where: { batch_id: batch.id } });
    await prisma.training_session.createMany({
      data: [
        { batch_id: batch.id, session_date: dateOnly(2026, 10, 5), topics_covered: `Orientation for ${demoProgram.name}`, created_by: registrar.id },
        { batch_id: batch.id, session_date: dateOnly(2026, 10, 7), topics_covered: `${demoProgram.topic}`, created_by: registrar.id },
        { batch_id: batch.id, session_date: dateOnly(2026, 10, 9), topics_covered: `Practical exercise for ${demoProgram.name}`, created_by: registrar.id },
      ],
    });

    for (const size of Object.values(size_enum)) {
      const itemName = `${demoProgram.code} Uniform`;
      const existingInventory = await prisma.inventory.findFirst({
        where: { program_id: program.id, item_name: itemName, sizes: size },
      });
      if (existingInventory) {
        await prisma.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: 10, updated_by: registrar.id },
        });
      } else {
        await prisma.inventory.create({
          data: { program_id: program.id, item_name: itemName, sizes: size, quantity: 10, updated_by: registrar.id },
        });
      }
    }

    for (const categoryName of ['BASIC', 'COMMON', 'CORE'] as const) {
      const competency = await prisma.competency.create({
        data: {
          program_id: program.id,
          category_id: categoryMap[categoryName],
          competency_code: `${categoryName.slice(0, 2)}${demoProgram.code}`.slice(0, 10),
          competency_title: `${categoryName} competency for ${demoProgram.name}`,
          sort_order: 1,
        },
      });

      await prisma.learning_outcome.create({
        data: {
          competency_id: competency.competency_id,
          outcome_number: 1,
          outcome_description: `Outcome 1 for ${competency.competency_title}`,
          sort_order: 1,
        },
      });
    }
  }

  const officeRoleMap: Record<string, string> = {};
  for (const roleName of DEMO_OFFICE_ROLES) {
    const role = await prisma.office_role.findFirst({ where: { role_name: roleName } });
    if (role) {
      officeRoleMap[roleName] = role.office_role_id;
    } else {
      const created = await prisma.office_role.create({ data: { role_name: roleName } });
      officeRoleMap[roleName] = created.office_role_id;
    }
  }

  for (const [batchIndex, batch] of seededBatches.entries()) {
    for (const [index, traineeData] of DEMO_TRAINEE_NAMES.entries()) {
      const traineeNumber = index + 1;
      const systemId = `DEMO-TRAINEE-${String(traineeNumber).padStart(3, '0')}`;

      const user = await prisma.users.upsert({
        where: { system_id: systemId },
        update: {
          first_name: traineeData.first_name,
          last_name: traineeData.last_name,
          middle_name: traineeData.middle_name,
          role: user_role_enum.TRAINEE,
          is_active: true,
        },
        create: {
          system_id: systemId,
          first_name: traineeData.first_name,
          last_name: traineeData.last_name,
          middle_name: traineeData.middle_name,
          password_hash: traineePassword,
          role: user_role_enum.TRAINEE,
          is_active: true,
        },
      });

      const existingTrainee = await prisma.trainee.findFirst({ where: { users_id: user.id } });
      const trainee = existingTrainee
        ? await prisma.trainee.update({
            where: { id: existingTrainee.id },
            data: {
              contact_number: `0917${String(traineeNumber).padStart(6, '0')}`,
              street_address: 'Demo Street',
              barangay: 'Demo Barangay',
              municipality: 'Demo Municipality',
              district: 'Demo District',
              province: 'Demo Province',
              gender: index % 2 === 0 ? gender_enum.MALE : gender_enum.FEMALE,
              date_of_birth: dateOnly(2000 + index, 2 + index, 10 + index),
              place_of_birth: 'Demo City',
              citizenship: 'FILIPINO',
              mother_name: 'Mother Doe',
              father_name: 'Father Doe',
              civil_status: civil_status_enum.SINGLE,
              highest_education: highest_education_enum.HIGH_SCHOOL,
              pwd: false,
              employment_status: employment_status_enum.STUDENT,
              employment_type: employment_type_enum.FULL_TIME,
            },
          })
        : await prisma.trainee.create({
            data: {
              users_id: user.id,
              contact_number: `0917${String(traineeNumber).padStart(6, '0')}`,
              street_address: 'Demo Street',
              barangay: 'Demo Barangay',
              municipality: 'Demo Municipality',
              district: 'Demo District',
              province: 'Demo Province',
              gender: index % 2 === 0 ? gender_enum.MALE : gender_enum.FEMALE,
              date_of_birth: dateOnly(2000 + index, 2 + index, 10 + index),
              place_of_birth: 'Demo City',
              citizenship: 'FILIPINO',
              mother_name: 'Mother Doe',
              father_name: 'Father Doe',
              civil_status: civil_status_enum.SINGLE,
              highest_education: highest_education_enum.HIGH_SCHOOL,
              pwd: false,
              employment_status: employment_status_enum.STUDENT,
              employment_type: employment_type_enum.FULL_TIME,
            },
          });

      const beneficiary = await prisma.trainee_beneficiaries.findFirst({ where: { trainee_id: trainee.id } });
      if (beneficiary) {
        await prisma.trainee_beneficiaries.update({
          where: { id: beneficiary.id },
          data: { last_name: traineeData.last_name, address: 'Demo Address' },
        });
      } else {
        await prisma.trainee_beneficiaries.create({
          data: {
            trainee_id: trainee.id,
            first_name: 'Beneficiary',
            last_name: traineeData.last_name,
            middle_name: '',
            relationship: 'Parent',
            contact_number: `0916${String(traineeNumber).padStart(6, '0')}`,
            id_number: `BEN-${String(traineeNumber).padStart(5, '0')}`,
            address: 'Demo Address',
          },
        });
      }

      const enrollment = await prisma.enrollments.create({
        data: {
          trainee_id: trainee.id,
          batch_id: batch.batchId,
          enrollment_status: enrollment_status_enum.ENROLLED,
          uniform_size: size_enum.M,
          enrolled_by: registrar.id,
        },
      });

      enrollmentRecords.push({ enrollmentId: enrollment.id });

      const hasPaidProcessingFee = traineeNumber % 2 === 0;
      if (hasPaidProcessingFee) {
        const processingReceipt = await prisma.official_receipts.create({
          data: {
            enrollment_id: enrollment.id,
            or_number: `OR-${currentYearSuffix}-${batchIndex + 1}-${String(traineeNumber).padStart(4, '0')}-P`,
            base_fee: 500,
            amount: 500,
            payment_date: dateOnly(2026, 10, 5),
            payment_method: payment_method_enum.CASH,
            reason_of_dues: payment_reason_enum.PROCESSING_FEE,
            remarks: 'Processing fee paid',
            confirmed_by: registrar.id,
          },
        });

        await prisma.insurance_coverage.create({
          data: {
            trainee_id: trainee.id,
            effective_date: dateOnly(2026, 10, 5),
            expiry_date: dateOnly(2027, 10, 5),
            official_receipt_id: processingReceipt.id,
          },
        });

        await prisma.official_receipts.create({
          data: {
            enrollment_id: enrollment.id,
            or_number: `OR-${currentYearSuffix}-${batchIndex + 1}-${String(traineeNumber).padStart(4, '0')}-E`,
            base_fee: 1000,
            amount: 1000,
            payment_date: dateOnly(2026, 10, 5),
            payment_method: payment_method_enum.GCASH,
            reason_of_dues: payment_reason_enum.ENROLLMENT,
            remarks: 'Enrollment fee',
            confirmed_by: registrar.id,
          },
        });
      } else {
        await prisma.official_receipts.create({
          data: {
            enrollment_id: enrollment.id,
            or_number: `OR-${currentYearSuffix}-${batchIndex + 1}-${String(traineeNumber).padStart(4, '0')}`,
            base_fee: 1000,
            amount: 1000,
            payment_date: dateOnly(2026, 10, 5),
            payment_method: payment_method_enum.GCASH,
            reason_of_dues: payment_reason_enum.ENROLLMENT,
            remarks: 'Enrollment fee only',
            confirmed_by: registrar.id,
          },
        });
      }

      await prisma.requirement_checklist.create({
        data: {
          enrollment_id: enrollment.id,
          checked_by: registrar.id,
          bc_nso_psa_copy: true,
          diploma_tor: true,
          brgy_clearance: true,
          one_by_one_pic: true,
          two_by_two_pic: true,
          passport_size: true,
          commitment_fee: hasPaidProcessingFee,
        },
      });

      const sessions = await prisma.training_session.findMany({ where: { batch_id: batch.batchId } });
      for (const session of sessions) {
        await prisma.attendance.create({
          data: {
            session_id: session.session_id,
            enrollment_id: enrollment.id,
            status: attendance_status_enum.PRESENT,
            recorded_by: registrar.id,
          },
        });
      }

      const inventoryItem = await prisma.inventory.findFirst({
        where: { program_id: batch.programId, item_name: { contains: 'Uniform' }, sizes: size_enum.M },
      });
      await prisma.distribution_checklist.create({
        data: {
          enrollment_id: enrollment.id,
          inventory_id: inventoryItem?.id ?? null,
          uniform_given: true,
          size_issued: size_enum.M,
          id_card_given: true,
          date_distributed: dateOnly(2026, 10, 10),
          distributed_by: registrar.id,
        },
      });

      const learningOutcome = await prisma.learning_outcome.findFirst({
        where: { competency: { program_id: batch.programId } },
      });
      if (learningOutcome) {
        await prisma.trainee_outcome_status.create({
          data: {
            enrollment_id: enrollment.id,
            learning_outcome_id: learningOutcome.learning_outcome_id,
            status: outcome_status_enum.PASSED,
            date_checked: dateOnly(2026, 12, 1),
            remarks: 'Demo passed outcome',
            checked_by: registrar.id,
          },
        });
      }

      await prisma.user_role.upsert({
        where: { users_id_office_role_id: { users_id: user.id, office_role_id: officeRoleMap['Registrar Office'] } },
        update: {},
        create: { users_id: user.id, office_role_id: officeRoleMap['Registrar Office'] },
      });
    }
  }

  const certificateTypeCoc = await prisma.certificate_type.upsert({
    where: { type: certificate_type_enum.COC },
    update: { description: 'Certificate of Completion' },
    create: { type: certificate_type_enum.COC, description: 'Certificate of Completion' },
  });

  let certificateTemplate = await prisma.certificates.findFirst({ where: { template_name: 'COC - DEMO' } });
  if (!certificateTemplate) {
    certificateTemplate = await prisma.certificates.create({
      data: {
        certificate_type_id: certificateTypeCoc.certificate_type_id,
        template_image: 'template-coc.png',
        template_name: 'COC - DEMO',
        is_active: true,
      },
    });
  }

  if (enrollmentRecords[0]) {
    const requestForm = await prisma.request_form.create({
      data: {
        enrollment_id: enrollmentRecords[0].enrollmentId,
        certificate_type_id: certificateTypeCoc.certificate_type_id,
        purpose_of_request: 'Employment',
        request_status: request_status_enum.APPROVED,
        is_window_open: true,
      },
    });

    const clearance = await prisma.clearance.create({
      data: {
        request_form_id: requestForm.id,
        enrollment_id: requestForm.enrollment_id,
        clearance_status: clearance_status_enum.CLEARED,
        surrendered_id: true,
        released_by: registrar.id,
        date_released: dateOnly(2026, 12, 1),
      },
    });

    await prisma.clearance_approval.create({
      data: {
        clearance_id: clearance.id,
        office_role_id: officeRoleMap['Registrar Office'],
        approval_status: approval_status_enum.APPROVED,
        date_signed: dateOnly(2026, 11, 15),
        signed_by: registrar.id,
      },
    });

    await prisma.clearance_certificate.create({
      data: {
        clearance_id: clearance.id,
        certificate_type_id: certificateTypeCoc.certificate_type_id,
      },
    });

    await prisma.generated_certificate.create({
      data: {
        clearance_id: clearance.id,
        enrollment_id: requestForm.enrollment_id,
        certificate_type_id: certificateTypeCoc.certificate_type_id,
        template_id: certificateTemplate.template_id,
        control_number: 'DEMO-CERT-001',
        release_status: release_status_enum.RELEASED,
        remarks: 'Demo generated certificate',
      },
    });
  }

  for (const certificateType of [certificate_type_enum.COT, certificate_type_enum.NC, certificate_type_enum.OTHER] as const) {
    const existingType = await prisma.certificate_type.findFirst({ where: { type: certificateType } });
    if (!existingType) {
      await prisma.certificate_type.create({
        data: { type: certificateType, description: `${certificateType} Description` },
      });
    }
  }

  await prisma.announcements.create({
    data: {
      posted_by: registrar.id,
      scope: announcement_scope_enum.GLOBAL,
      content: 'Demo enrollment session started. All programs are available for enrollment.',
      remarks: 'Demo announcement',
    },
  });

  const firstProgram = await prisma.programs.findFirst({ orderBy: { created_at: 'asc' } });
  if (firstProgram) {
    await prisma.announcements.create({
      data: {
        posted_by: registrar.id,
        scope: announcement_scope_enum.PROGRAM,
        program_id: firstProgram.id,
        content: 'AutoCAD batch opening soon!',
        remarks: 'Program announcement',
      },
    });
  }

  await prisma.sessions.create({
    data: {
      user_id: registrar.id,
      expires: new Date(Date.now() + 3600000),
      session_token: `demo-session-${Date.now()}`,
    },
  });

  console.log('Demo seed completed successfully.');
  console.log(`Programs seeded: ${seededPrograms.length}`);
  console.log(`Batches seeded: ${seededBatches.length}`);
  console.log(`Enrollments seeded: ${enrollmentRecords.length}`);
}

main()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
