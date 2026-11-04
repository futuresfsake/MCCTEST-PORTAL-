import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { withdrawal_status_enum as Status } from '../generated/prisma/client';
import { WithdrawalService } from './withdrawal.service';

const TRAINER_USER = '11111111-1111-4111-8111-111111111111';
const OTHER_TRAINER_USER = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';
const BATCH_ID = '66666666-6666-4666-8666-666666666666';

function trainerRow(overrides: Record<string, unknown> = {}) {
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
      id: 'e1',
      enrollment_status: 'ENROLLED',
      batch: {
        id: BATCH_ID,
        batch_name: 'Batch 1',
        programs: { name: 'Welding NCII' },
      },
      trainee: {
        users: { first_name: 'Ana', last_name: 'Cruz', system_id: 'TRN-ANA' },
      },
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

/** What assertTrainerOwns reads: the request's batch and that batch's trainer. */
function ownedBy(userId: string) {
  return {
    enrollments: { batch: { trainer: { user_id: userId } } },
  };
}

describe('WithdrawalService (trainer)', () => {
  const prisma = {
    $transaction: jest.fn(),
    withdrawal_request: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    withdrawal_status_history: { create: jest.fn() },
  };
  const service = new WithdrawalService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
  });

  describe('listForTrainer', () => {
    beforeEach(() => {
      prisma.withdrawal_request.findMany.mockResolvedValue([trainerRow()]);
      prisma.withdrawal_request.count.mockResolvedValue(1);
    });

    it("only ever queries the caller's own batches, and defaults to what needs the trainer", async () => {
      const result = await service.listForTrainer(TRAINER_USER, {});

      const args = prisma.withdrawal_request.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        enrollments: { batch: { trainer: { user_id: TRAINER_USER } } },
        withdrawal_status: Status.PENDING_VALIDATION,
      });
      expect(args.skip).toBe(0);
      expect(args.take).toBe(10);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(result.data[0]).toMatchObject({
        id: REQUEST_ID,
        status: Status.PENDING_VALIDATION,
        dateRequested: '2026-11-04',
        trainee: { name: 'Ana Cruz', systemId: 'TRN-ANA' },
        enrollment: {
          batchId: BATCH_ID,
          batchName: 'Batch 1',
          programName: 'Welding NCII',
        },
      });
    });

    it('DECIDED is the trainer log: own batches, already acted on, newest decision first', async () => {
      await service.listForTrainer(TRAINER_USER, { status: 'DECIDED' });

      const args = prisma.withdrawal_request.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        enrollments: { batch: { trainer: { user_id: TRAINER_USER } } },
        trainer_validated_by: { not: null },
      });
      expect(args.orderBy[0]).toEqual({ trainer_validated_at: 'desc' });
    });

    it('ALL removes the status filter, a status narrows it, a batch narrows the batch', async () => {
      await service.listForTrainer(TRAINER_USER, { status: 'ALL' });
      expect(
        prisma.withdrawal_request.findMany.mock.calls[0][0].where,
      ).not.toHaveProperty('withdrawal_status');

      await service.listForTrainer(TRAINER_USER, {
        status: Status.REJECTED,
        batchId: BATCH_ID,
      });
      const where = prisma.withdrawal_request.findMany.mock.calls[1][0].where;
      expect(where.withdrawal_status).toBe(Status.REJECTED);
      expect(where.enrollments.batch).toEqual({
        trainer: { user_id: TRAINER_USER },
        id: BATCH_ID,
      });
    });

    it('searches by name or system ID, every word must match', async () => {
      await service.listForTrainer(TRAINER_USER, { search: 'ana  cruz' });

      const users =
        prisma.withdrawal_request.findMany.mock.calls[0][0].where.enrollments
          .trainee.users;
      expect(users.AND).toHaveLength(2);
      expect(users.AND[0].OR).toEqual([
        { first_name: { contains: 'ana', mode: 'insensitive' } },
        { middle_name: { contains: 'ana', mode: 'insensitive' } },
        { last_name: { contains: 'ana', mode: 'insensitive' } },
        { system_id: { contains: 'ana', mode: 'insensitive' } },
      ]);
    });

    it('paginates', async () => {
      prisma.withdrawal_request.count.mockResolvedValue(23);
      const result = await service.listForTrainer(TRAINER_USER, {
        page: 3,
        limit: 10,
      });
      expect(prisma.withdrawal_request.findMany.mock.calls[0][0].skip).toBe(20);
      expect(result.meta.totalPages).toBe(3);
    });

    it('never asks for contact details or a password hash', async () => {
      await service.listForTrainer(TRAINER_USER, {});
      const query = JSON.stringify(
        prisma.withdrawal_request.findMany.mock.calls[0][0],
      );
      expect(query).not.toContain('password_hash');
      expect(query).not.toContain('contact_number');
      expect(query).not.toContain('street_address');
    });
  });

  describe('getForTrainer', () => {
    it('returns the request with trainee, stages and history', async () => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(
        ownedBy(TRAINER_USER),
      );
      prisma.withdrawal_request.findUniqueOrThrow.mockResolvedValue(
        trainerRow(),
      );

      const result = await service.getForTrainer(TRAINER_USER, REQUEST_ID);

      expect(result.trainee).toEqual({ name: 'Ana Cruz', systemId: 'TRN-ANA' });
      expect(result.history).toHaveLength(1);
      expect(Object.keys(result.stages)).toEqual([
        'trainer',
        'registrar',
        'admin',
      ]);
      expect(JSON.stringify(result)).not.toContain('password');
    });

    it('404 for a request that does not exist', async () => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(null);
      await expect(
        service.getForTrainer(TRAINER_USER, REQUEST_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it("403 for another trainer's batch, and nothing is read", async () => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(
        ownedBy(OTHER_TRAINER_USER),
      );
      await expect(
        service.getForTrainer(TRAINER_USER, REQUEST_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(
        prisma.withdrawal_request.findUniqueOrThrow,
      ).not.toHaveBeenCalled();
    });
  });

  describe('validateByTrainer', () => {
    beforeEach(() => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(
        ownedBy(TRAINER_USER),
      );
      prisma.withdrawal_request.updateMany.mockResolvedValue({ count: 1 });
      prisma.withdrawal_request.findUniqueOrThrow.mockResolvedValue(
        trainerRow({ withdrawal_status: Status.TRAINER_VALIDATED }),
      );
    });

    it('approve: moves to TRAINER_VALIDATED, records who and when, writes history', async () => {
      const result = await service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
        action: 'APPROVE',
        remarks: 'Attendance is clear',
      });

      const call = prisma.withdrawal_request.updateMany.mock.calls[0][0];
      // The guard is in the update itself, so a concurrent cancel cannot slip through.
      expect(call.where).toEqual({
        withdrawal_request_id: REQUEST_ID,
        withdrawal_status: Status.PENDING_VALIDATION,
      });
      expect(call.data).toMatchObject({
        withdrawal_status: Status.TRAINER_VALIDATED,
        trainer_validated: true,
        trainer_validated_by: TRAINER_USER,
        trainer_remarks: 'Attendance is clear',
      });
      expect(call.data.trainer_validated_at).toBeInstanceOf(Date);
      expect(prisma.withdrawal_status_history.create).toHaveBeenCalledWith({
        data: {
          withdrawal_request_id: REQUEST_ID,
          old_status: Status.PENDING_VALIDATION,
          new_status: Status.TRAINER_VALIDATED,
          changed_by: TRAINER_USER,
          remarks: 'Attendance is clear',
        },
      });
      expect(result.status).toBe(Status.TRAINER_VALIDATED);
    });

    it('approve without remarks stores none', async () => {
      await service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
        action: 'APPROVE',
      });
      expect(
        prisma.withdrawal_request.updateMany.mock.calls[0][0].data
          .trainer_remarks,
      ).toBeNull();
      expect(
        prisma.withdrawal_status_history.create.mock.calls[0][0].data.remarks,
      ).toBeNull();
    });

    it('reject: moves to REJECTED, keeps trainer_validated false, and the reason reaches the history', async () => {
      prisma.withdrawal_request.findUniqueOrThrow.mockResolvedValue(
        trainerRow({ withdrawal_status: Status.REJECTED }),
      );

      const result = await service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
        action: 'REJECT',
        remarks: 'Still owes 3 days of attendance',
      });

      const data = prisma.withdrawal_request.updateMany.mock.calls[0][0].data;
      expect(data).toMatchObject({
        withdrawal_status: Status.REJECTED,
        trainer_validated: false,
        trainer_validated_by: TRAINER_USER,
        trainer_remarks: 'Still owes 3 days of attendance',
      });
      expect(
        prisma.withdrawal_status_history.create.mock.calls[0][0].data,
      ).toMatchObject({
        new_status: Status.REJECTED,
        remarks: 'Still owes 3 days of attendance',
      });
      expect(result.status).toBe(Status.REJECTED);
    });

    it('400 when the request is not waiting for the trainer, and no history is written', async () => {
      prisma.withdrawal_request.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
          action: 'APPROVE',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.withdrawal_status_history.create).not.toHaveBeenCalled();
    });

    it("403 for another trainer's request, with no update and no history", async () => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(
        ownedBy(OTHER_TRAINER_USER),
      );
      await expect(
        service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
          action: 'APPROVE',
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.withdrawal_request.updateMany).not.toHaveBeenCalled();
      expect(prisma.withdrawal_status_history.create).not.toHaveBeenCalled();
    });

    it('404 for a request that does not exist', async () => {
      prisma.withdrawal_request.findUnique.mockResolvedValue(null);
      await expect(
        service.validateByTrainer(TRAINER_USER, REQUEST_ID, {
          action: 'APPROVE',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.withdrawal_request.updateMany).not.toHaveBeenCalled();
    });
  });
});
