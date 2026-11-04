import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  withdrawal_status_enum as Status,
} from '../generated/prisma/client';
import { WithdrawalService } from './withdrawal.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TRAINEE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_TRAINEE_ID = '33333333-3333-4333-8333-333333333333';
const ENROLLMENT_ID = '44444444-4444-4444-8444-444444444444';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    withdrawal_request_id: REQUEST_ID,
    withdrawal_status: Status.PENDING_VALIDATION,
    requested_reason: 'Moving to another city',
    date_requested: new Date('2026-11-04T00:00:00.000Z'),
    trainer_validated: false,
    trainer_validated_at: null,
    registrar_validated_at: null,
    admin_signed_off_at: null,
    trainer_validator: null,
    registrar_validator: null,
    admin_signer: null,
    enrollments: {
      id: ENROLLMENT_ID,
      enrollment_status: 'ENROLLED',
      batch: { batch_name: 'Batch 1', programs: { name: 'Welding NCII' } },
    },
    status_history: [
      {
        id: 'h1',
        old_status: null,
        new_status: Status.PENDING_VALIDATION,
        changed_at: new Date('2026-11-04T01:00:00.000Z'),
        remarks: null,
        changed_by_user: {
          first_name: 'Ana',
          last_name: 'Cruz',
          role: 'TRAINEE',
        },
      },
    ],
    ...overrides,
  };
}

describe('WithdrawalService (trainee)', () => {
  const prisma = {
    $transaction: jest.fn(),
    trainee: { findUnique: jest.fn() },
    enrollments: { findUnique: jest.fn() },
    withdrawal_request: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    withdrawal_status_history: { create: jest.fn() },
  };
  const service = new WithdrawalService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    // Callback form runs against the same mock; array form runs all queries.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
    prisma.trainee.findUnique.mockResolvedValue({ id: TRAINEE_ID });
  });

  describe('createForTrainee', () => {
    const dto = {
      enrollment_id: ENROLLMENT_ID,
      requested_reason: 'Moving to another city',
    };

    it('rejects an account that has no trainee profile (403)', async () => {
      prisma.trainee.findUnique.mockResolvedValue(null);
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects someone else's enrollment (403) without creating anything", async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: OTHER_TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('answers a missing enrollment the same way as a foreign one (403)', async () => {
      prisma.enrollments.findUnique.mockResolvedValue(null);
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each(['PENDING', 'WITHDRAWN', 'COMPLETED', 'DROPPED'])(
      'rejects an enrollment that is %s (400)',
      async (status) => {
        prisma.enrollments.findUnique.mockResolvedValue({
          id: ENROLLMENT_ID,
          trainee_id: TRAINEE_ID,
          enrollment_status: status,
        });
        await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('rejects a duplicate while a request is still open (409)', async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      prisma.withdrawal_request.findFirst.mockResolvedValue({
        withdrawal_request_id: REQUEST_ID,
      });

      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );

      // "Open" means all three in-progress states, not only the first one.
      const where = prisma.withdrawal_request.findFirst.mock.calls[0][0].where;
      expect(where.withdrawal_status.in).toEqual([
        Status.PENDING_VALIDATION,
        Status.TRAINER_VALIDATED,
        Status.PENDING_ADMIN_SIGNOFF,
      ]);
      expect(prisma.withdrawal_request.create).not.toHaveBeenCalled();
    });

    it('creates the request and its first history row in one serializable transaction', async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      // 1st call = duplicate check (none open), 2nd call = detail read-back.
      prisma.withdrawal_request.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(detailRow());
      prisma.withdrawal_request.create.mockResolvedValue({
        withdrawal_request_id: REQUEST_ID,
      });

      const result = await service.createForTrainee(USER_ID, dto);

      const data = prisma.withdrawal_request.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        enrollment_id: ENROLLMENT_ID,
        requested_reason: 'Moving to another city',
        withdrawal_status: Status.PENDING_VALIDATION,
      });
      expect(data.date_requested).toBeInstanceOf(Date);
      expect(prisma.withdrawal_status_history.create).toHaveBeenCalledWith({
        data: {
          withdrawal_request_id: REQUEST_ID,
          old_status: null,
          new_status: Status.PENDING_VALIDATION,
          changed_by: USER_ID,
        },
      });
      expect(prisma.$transaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      expect(result.id).toBe(REQUEST_ID);
      expect(result.status).toBe(Status.PENDING_VALIDATION);
    });

    it('turns the pg driver adapter serialization failure (40001) into 409', async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      // Shape observed from the real driver when two submits overlap.
      const adapterError = Object.assign(
        new Error('TransactionWriteConflict'),
        {
          name: 'DriverAdapterError',
          cause: { originalCode: '40001', kind: 'TransactionWriteConflict' },
        },
      );
      prisma.$transaction.mockRejectedValue(adapterError);
      await expect(
        service.createForTrainee(USER_ID, {
          enrollment_id: ENROLLMENT_ID,
          requested_reason: 'x',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('does not hide unrelated errors behind the conflict handling', async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      prisma.$transaction.mockRejectedValue(new Error('connection lost'));
      await expect(
        service.createForTrainee(USER_ID, {
          enrollment_id: ENROLLMENT_ID,
          requested_reason: 'x',
        }),
      ).rejects.toThrow('connection lost');
    });

    it('turns a serialization conflict from a simultaneous submit into 409', async () => {
      prisma.enrollments.findUnique.mockResolvedValue({
        id: ENROLLMENT_ID,
        trainee_id: TRAINEE_ID,
        enrollment_status: 'ENROLLED',
      });
      prisma.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: 'test',
        }),
      );
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listForTrainee', () => {
    it("only ever queries the caller's own enrollments, newest first, paginated", async () => {
      prisma.withdrawal_request.findMany.mockResolvedValue([detailRow()]);
      prisma.withdrawal_request.count.mockResolvedValue(11);

      const result = await service.listForTrainee(USER_ID, {
        page: 2,
        limit: 5,
        status: Status.TRAINER_VALIDATED,
      });

      const args = prisma.withdrawal_request.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        enrollments: { trainee_id: TRAINEE_ID },
        withdrawal_status: Status.TRAINER_VALIDATED,
      });
      expect(args.skip).toBe(5);
      expect(args.take).toBe(5);
      expect(args.orderBy[0]).toEqual({ date_requested: 'desc' });
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
      });
      expect(result.data[0]).toMatchObject({
        id: REQUEST_ID,
        dateRequested: '2026-11-04',
        enrollment: { batchName: 'Batch 1', programName: 'Welding NCII' },
      });
    });

    it('applies sensible defaults and no status filter', async () => {
      prisma.withdrawal_request.findMany.mockResolvedValue([]);
      prisma.withdrawal_request.count.mockResolvedValue(0);

      const result = await service.listForTrainee(USER_ID, {});

      const args = prisma.withdrawal_request.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ enrollments: { trainee_id: TRAINEE_ID } });
      expect(args.skip).toBe(0);
      expect(args.take).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getForTrainee', () => {
    it('scopes the lookup to the caller and returns the pipeline and history', async () => {
      prisma.withdrawal_request.findFirst.mockResolvedValue(detailRow());

      const result = await service.getForTrainee(USER_ID, REQUEST_ID);

      expect(
        prisma.withdrawal_request.findFirst.mock.calls[0][0].where,
      ).toEqual({
        withdrawal_request_id: REQUEST_ID,
        enrollments: { trainee_id: TRAINEE_ID },
      });
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toMatchObject({
        newStatus: Status.PENDING_VALIDATION,
        changedBy: { name: 'Ana Cruz', role: 'TRAINEE' },
      });
      expect(result.stages.trainer).toEqual({
        validated: false,
        by: null,
        at: null,
      });
    });

    it("answers someone else's request exactly like a missing one (404)", async () => {
      prisma.withdrawal_request.findFirst.mockResolvedValue(null);
      await expect(service.getForTrainee(USER_ID, REQUEST_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('never asks for password_hash or returns validator remarks', async () => {
      prisma.withdrawal_request.findFirst.mockResolvedValue(detailRow());
      const result = await service.getForTrainee(USER_ID, REQUEST_ID);

      const query = JSON.stringify(
        prisma.withdrawal_request.findFirst.mock.calls[0][0],
      );
      expect(query).not.toContain('password_hash');
      expect(JSON.stringify(result)).not.toContain('password_hash');
      expect(JSON.stringify(result)).not.toContain('trainer_remarks');
    });
  });

  describe('cancelForTrainee', () => {
    it('cancels a pending request with a conditional update and a history row', async () => {
      prisma.withdrawal_request.findFirst
        .mockResolvedValueOnce({
          withdrawal_status: Status.PENDING_VALIDATION,
        })
        .mockResolvedValueOnce(
          detailRow({ withdrawal_status: Status.CANCELLED }),
        );
      prisma.withdrawal_request.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.cancelForTrainee(USER_ID, REQUEST_ID);

      expect(prisma.withdrawal_request.updateMany).toHaveBeenCalledWith({
        where: {
          withdrawal_request_id: REQUEST_ID,
          withdrawal_status: Status.PENDING_VALIDATION,
        },
        data: { withdrawal_status: Status.CANCELLED },
      });
      expect(prisma.withdrawal_status_history.create).toHaveBeenCalledWith({
        data: {
          withdrawal_request_id: REQUEST_ID,
          old_status: Status.PENDING_VALIDATION,
          new_status: Status.CANCELLED,
          changed_by: USER_ID,
        },
      });
      expect(result.status).toBe(Status.CANCELLED);
    });

    it('refuses once the trainer has acted (400) and writes no history', async () => {
      prisma.withdrawal_request.findFirst.mockResolvedValue({
        withdrawal_status: Status.TRAINER_VALIDATED,
      });
      prisma.withdrawal_request.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.cancelForTrainee(USER_ID, REQUEST_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.withdrawal_status_history.create).not.toHaveBeenCalled();
    });

    it("answers someone else's request like a missing one (404)", async () => {
      prisma.withdrawal_request.findFirst.mockResolvedValue(null);
      await expect(
        service.cancelForTrainee(USER_ID, REQUEST_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.withdrawal_request.updateMany).not.toHaveBeenCalled();
    });
  });
});
