import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { clearance_request_status_enum as Status } from '../generated/prisma/client';
import { ClearanceService } from './clearance.service';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TRAINEE_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_TRAINEE_ID = '33333333-3333-4333-8333-333333333333';
const ENROLLMENT_ID = '44444444-4444-4444-8444-444444444444';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';

const enrollmentRow = {
  id: ENROLLMENT_ID,
  enrollment_status: 'ENROLLED',
  batch: {
    batch_name: 'Batch 1',
    end_date: new Date('2026-11-20T00:00:00.000Z'),
    programs: { name: 'Welding NCII' },
    trainer: { users: { first_name: 'Ben', last_name: 'Reyes' } },
  },
  trainee: {
    contact_number: '09170000000',
    street_address: '1 Main St',
    barangay: 'Looc',
    municipality: 'Mandaue',
    province: 'Cebu',
    users: {
      first_name: 'Ana',
      middle_name: 'B',
      last_name: 'Cruz',
      system_id: 'ana.cruz_mcctest',
    },
  },
};

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    control_number: 'MCCTEST001',
    pipeline_status: Status.PENDING_VALIDATION,
    requested_at: new Date('2026-11-27T01:00:00.000Z'),
    purpose_of_request: 'Job application',
    certified: true,
    certified_at: new Date('2026-11-27T01:00:00.000Z'),
    enrollments: enrollmentRow,
    clearance: {
      clearance_status: 'PENDING',
      surrendered_id: false,
      schedule: null,
      date_released: null,
      clearance_certificate: [
        { other_specify: null, certificate_type: { type: 'COT' } },
        { other_specify: null, certificate_type: { type: 'COC' } },
      ],
    },
    status_history: [
      {
        id: 'h1',
        old_status: null,
        new_status: Status.PENDING_VALIDATION,
        changed_at: new Date('2026-11-27T01:00:00.000Z'),
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

describe('ClearanceService (trainee)', () => {
  const prisma = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    trainee: { findUnique: jest.fn() },
    enrollments: { findUnique: jest.fn(), findMany: jest.fn() },
    certificate_type: { findMany: jest.fn() },
    request_form: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    clearance: { create: jest.fn() },
    clearance_status_history: { create: jest.fn() },
  };
  const service = new ClearanceService(prisma as never);

  const dto = {
    enrollment_id: ENROLLMENT_ID,
    certificates: ['COT', 'COC'] as never,
    purpose_of_request: 'Job application',
    certified: true,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    // Callback form runs against the same mock; array form runs all queries.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    );
    prisma.$queryRaw.mockResolvedValue([{ value: 7n }]);
    prisma.trainee.findUnique.mockResolvedValue({ id: TRAINEE_ID });
  });

  function readyToSubmit(status = 'ENROLLED') {
    prisma.enrollments.findUnique.mockResolvedValue({
      id: ENROLLMENT_ID,
      trainee_id: TRAINEE_ID,
      enrollment_status: status,
    });
    prisma.request_form.findFirst
      .mockReset()
      .mockResolvedValueOnce(null) // no open request
      .mockResolvedValue(detailRow());
    prisma.certificate_type.findMany.mockResolvedValue([
      { type: 'COT', certificate_type_id: 'cot-id' },
      { type: 'COC', certificate_type_id: 'coc-id' },
      { type: 'OTHER', certificate_type_id: 'other-id' },
    ]);
    prisma.request_form.create.mockResolvedValue({ id: REQUEST_ID });
  }

  it('refuses an account with no trainee profile', async () => {
    prisma.trainee.findUnique.mockResolvedValue(null);
    await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  describe('createForTrainee', () => {
    it.each(['ENROLLED', 'COMPLETED'])(
      'saves the request, the clearance and one history row (%s)',
      async (status) => {
        readyToSubmit(status);

        const result = await service.createForTrainee(USER_ID, dto);

        expect(prisma.request_form.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              enrollment_id: ENROLLMENT_ID,
              certificate_type_id: 'coc-id',
              control_number: 'MCCTEST007',
              pipeline_status: Status.PENDING_VALIDATION,
              certified: true,
              certified_at: expect.any(Date) as Date,
              other_specify: null,
            }) as object,
          }),
        );
        expect(prisma.clearance.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              clearance_status: 'PENDING',
              clearance_certificate: {
                create: [
                  { certificate_type_id: 'coc-id', other_specify: null },
                  { certificate_type_id: 'cot-id', other_specify: null },
                ],
              },
            }) as object,
          }),
        );
        expect(prisma.clearance_status_history.create.mock.calls).toEqual([
          [
            {
              data: {
                request_form_id: REQUEST_ID,
                old_status: null,
                new_status: Status.PENDING_VALIDATION,
                changed_by: USER_ID,
              },
            },
          ],
        ]);
        expect(result.controlNumber).toBe('MCCTEST001');
      },
    );

    it('saves the "other" text when Other is chosen', async () => {
      readyToSubmit();
      await service.createForTrainee(USER_ID, {
        ...dto,
        certificates: ['OTHER'] as never,
        other_specify: 'Transcript',
      });
      expect(prisma.request_form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certificate_type_id: 'other-id',
            other_specify: 'Transcript',
          }) as object,
        }),
      );
    });

    it('drops the "other" text when Other is not chosen', async () => {
      readyToSubmit();
      await service.createForTrainee(USER_ID, {
        ...dto,
        other_specify: 'ignored',
      });
      expect(prisma.request_form.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ other_specify: null }) as object,
        }),
      );
    });

    it.each([
      ['missing', null],
      [
        "someone else's",
        {
          id: ENROLLMENT_ID,
          trainee_id: OTHER_TRAINEE_ID,
          enrollment_status: 'ENROLLED',
        },
      ],
    ])('answers 403 for a %s enrollment', async (_label, row) => {
      prisma.enrollments.findUnique.mockResolvedValue(row);
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.request_form.create).not.toHaveBeenCalled();
    });

    it.each(['PENDING', 'WITHDRAWN', 'DROPPED'])(
      'answers 400 for a %s enrollment',
      async (status) => {
        readyToSubmit(status);
        await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.request_form.create).not.toHaveBeenCalled();
      },
    );

    it('answers 409 when a request is already open', async () => {
      readyToSubmit();
      prisma.request_form.findFirst
        .mockReset()
        .mockResolvedValue({ id: REQUEST_ID });
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.request_form.findFirst).toHaveBeenCalledWith({
        where: {
          enrollment_id: ENROLLMENT_ID,
          pipeline_status: {
            in: [
              Status.PENDING_VALIDATION,
              Status.TRAINER_VALIDATED,
              Status.REGISTRAR_VALIDATED,
              Status.PROCESSED,
            ],
          },
        },
        select: { id: true },
      });
      expect(prisma.request_form.create).not.toHaveBeenCalled();
    });

    it('saves nothing when a certificate type is not set up', async () => {
      readyToSubmit();
      prisma.certificate_type.findMany.mockResolvedValue([]);
      await expect(service.createForTrainee(USER_ID, dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prisma.request_form.create).not.toHaveBeenCalled();
    });
  });

  describe('listForTrainee', () => {
    it('lists only own requests, filtered and paged', async () => {
      prisma.request_form.findMany.mockResolvedValue([detailRow()]);
      prisma.request_form.count.mockResolvedValue(11);

      const result = await service.listForTrainee(USER_ID, {
        status: Status.RELEASED,
        page: 2,
        limit: 5,
      });

      expect(prisma.request_form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            enrollments: { trainee_id: TRAINEE_ID },
            pipeline_status: Status.RELEASED,
          },
          skip: 5,
          take: 5,
        }),
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 11,
        totalPages: 3,
      });
      expect(result.data[0].certificates.map((c) => c.type)).toEqual([
        'COC',
        'COT',
      ]);
    });
  });

  describe('getForTrainee', () => {
    it('returns the filled-in form and the history', async () => {
      prisma.request_form.findFirst.mockResolvedValue(detailRow());
      const result = await service.getForTrainee(USER_ID, REQUEST_ID);
      expect(result.form).toMatchObject({
        trainerName: 'Ben Reyes',
        dateCompleted: null,
        trainee: {
          name: 'Ana B Cruz',
          address: '1 Main St, Looc, Mandaue, Cebu',
        },
      });
      expect(result.history).toHaveLength(1);
      expect(JSON.stringify(result)).not.toContain('password');
    });

    it('uses the batch end date once the enrollment is completed', async () => {
      prisma.request_form.findFirst.mockResolvedValue(
        detailRow({
          enrollments: { ...enrollmentRow, enrollment_status: 'COMPLETED' },
        }),
      );
      const result = await service.getForTrainee(USER_ID, REQUEST_ID);
      expect(result.form.dateCompleted).toBe('2026-11-20');
    });

    it("answers 403 for a missing or someone else's request", async () => {
      prisma.request_form.findFirst.mockResolvedValue(null);
      await expect(service.getForTrainee(USER_ID, REQUEST_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancelForTrainee', () => {
    it('cancels a pending request and writes the history row', async () => {
      prisma.request_form.findFirst.mockResolvedValue(
        detailRow({ pipeline_status: Status.CANCELLED }),
      );
      prisma.request_form.updateMany.mockResolvedValue({ count: 1 });

      await service.cancelForTrainee(USER_ID, REQUEST_ID);

      expect(prisma.request_form.updateMany).toHaveBeenCalledWith({
        where: {
          id: REQUEST_ID,
          pipeline_status: Status.PENDING_VALIDATION,
        },
        data: {
          pipeline_status: Status.CANCELLED,
          request_status: 'CANCELLED',
        },
      });
      expect(prisma.clearance_status_history.create).toHaveBeenCalledWith({
        data: {
          request_form_id: REQUEST_ID,
          old_status: Status.PENDING_VALIDATION,
          new_status: Status.CANCELLED,
          changed_by: USER_ID,
        },
      });
    });

    it('answers 400 once the request has moved on (also the lost race)', async () => {
      prisma.request_form.findFirst.mockResolvedValue({ id: REQUEST_ID });
      prisma.request_form.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.cancelForTrainee(USER_ID, REQUEST_ID),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.clearance_status_history.create).not.toHaveBeenCalled();
    });

    it("answers 403 for someone else's request and changes nothing", async () => {
      prisma.request_form.findFirst.mockResolvedValue(null);
      await expect(
        service.cancelForTrainee(USER_ID, REQUEST_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.request_form.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getFormOptionsForTrainee', () => {
    it('marks the enrollment that already has an open request', async () => {
      prisma.enrollments.findMany.mockResolvedValue([
        { ...enrollmentRow, request_form: [{ id: REQUEST_ID }] },
      ]);
      const result = await service.getFormOptionsForTrainee(USER_ID);
      expect(result.enrollments[0].openRequestId).toBe(REQUEST_ID);
      expect(prisma.enrollments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            trainee_id: TRAINEE_ID,
            enrollment_status: { in: ['ENROLLED', 'COMPLETED'] },
          },
        }),
      );
    });
  });
});
