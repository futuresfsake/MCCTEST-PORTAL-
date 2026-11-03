import { NotFoundException } from '@nestjs/common';
import { TraineeInformationService } from './trainee-information.service';
import { TraineeListQueryDto } from './dto/trainee-list-query.dto';

const baseQuery = (overrides: Partial<TraineeListQueryDto> = {}) =>
  Object.assign(new TraineeListQueryDto(), overrides);

describe('TraineeInformationService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    trainee: { findFirst: jest.fn() },
  };
  let service: TraineeInformationService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TraineeInformationService(prisma as never);
  });

  describe('listTrainees', () => {
    const row = {
      id: 't1',
      contact_number: '09170000000',
      first_name: 'Juan',
      middle_name: null,
      last_name: 'Dela Cruz',
      system_id: 'juan01',
      email: 'juan@example.com',
      enrollment_id: 'e1',
      enrollment_status: 'ENROLLED',
      id_card_number: 'ID-1',
      enrolled_at: new Date('2026-10-01T00:00:00Z'),
      batch_name: 'Batch A',
      program_name: 'Welding',
      enrollment_count: 3,
    };

    it('runs one page query and one count query, and maps the rows', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([{ total: 25 }]);

      const result = await service.listTrainees(
        baseQuery({ page: 2, limit: 10 }),
      );

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result).toMatchObject({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
      expect(result.data[0]).toMatchObject({
        id: 't1',
        firstName: 'Juan',
        middleName: '',
        lastName: 'Dela Cruz',
        username: 'juan01',
        otherEnrollmentCount: 2,
        enrollment: { id: 'e1', programName: 'Welding', batchName: 'Batch A' },
      });
    });

    it('returns a null enrollment and no extras for a trainee without enrollments', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([
          {
            ...row,
            enrollment_id: null,
            enrollment_status: null,
            enrolled_at: null,
            enrollment_count: 0,
          },
        ])
        .mockResolvedValueOnce([{ total: 1 }]);

      const result = await service.listTrainees(baseQuery());

      expect(result.data[0].enrollment).toBeNull();
      expect(result.data[0].otherEnrollmentCount).toBe(0);
    });

    it('returns zero pages when nothing matches', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: 0 }]);

      const result = await service.listTrainees(baseQuery({ search: 'zzz' }));

      expect(result).toMatchObject({ data: [], total: 0, totalPages: 0 });
    });
  });

  describe('getTraineeProfile', () => {
    it('throws NotFoundException for an unknown trainee', async () => {
      prisma.trainee.findFirst.mockResolvedValue(null);

      await expect(service.getTraineeProfile('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('never selects password_hash or auth state', async () => {
      prisma.trainee.findFirst.mockResolvedValue(null);
      await service.getTraineeProfile('x').catch(() => undefined);

      const args = prisma.trainee.findFirst.mock.calls[0][0] as object;
      expect(JSON.stringify(args)).not.toMatch(/password|token|session/i);
    });
  });
});

describe('TraineeInformationService trainer scope', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    trainee: { findFirst: jest.fn() },
    programs: { findMany: jest.fn() },
    batch: { findMany: jest.fn() },
  };
  const service = new TraineeInformationService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('looks up a profile only among trainees in the trainer batches', async () => {
    prisma.trainee.findFirst.mockResolvedValue(null);

    await expect(
      service.getTraineeProfile('t1', { trainerUserId: 'u1' }),
    ).rejects.toThrow(NotFoundException);

    const args = prisma.trainee.findFirst.mock.calls[0][0] as {
      where: object;
    };
    expect(JSON.stringify(args.where)).toContain('u1');
  });

  it('does not restrict the profile lookup without a scope', async () => {
    prisma.trainee.findFirst.mockResolvedValue(null);

    await service.getTraineeProfile('t1').catch(() => undefined);

    const args = prisma.trainee.findFirst.mock.calls[0][0] as {
      where: object;
    };
    expect(args.where).toEqual({ id: 't1' });
  });

  it('offers a trainer only the programs and batches they are assigned', async () => {
    prisma.programs.findMany.mockResolvedValue([]);
    prisma.batch.findMany.mockResolvedValue([]);

    await service.getFilterOptions({ trainerUserId: 'u1' });

    const programArgs = prisma.programs.findMany.mock.calls[0][0] as {
      where: object;
    };
    const batchArgs = prisma.batch.findMany.mock.calls[0][0] as {
      where: object;
    };
    expect(JSON.stringify(programArgs.where)).toContain('u1');
    expect(JSON.stringify(batchArgs.where)).toContain('u1');
  });
});
