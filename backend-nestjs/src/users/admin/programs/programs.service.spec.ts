import { ConflictException } from '@nestjs/common';
import { ProgramsService } from './programs.service';

const USER_ID = '33333333-3333-4333-8333-333333333333';
const PROGRAM = { id: '44444444-4444-4444-8444-444444444444', name: 'Welding' };

describe('ProgramsService.create default inventory', () => {
  const tx = { programs: { create: jest.fn() } };
  const prisma = {
    programs: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const inventoryService = { seedDefaultStock: jest.fn() };
  const service = new ProgramsService(
    prisma as never,
    inventoryService as never,
  );

  const dto = {
    name: 'Welding',
    program_code: 'WLD',
    control_number_prefix: 'WLD',
  } as never;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: (t: typeof tx) => unknown) =>
      fn(tx),
    );
    prisma.programs.findFirst.mockResolvedValue(null);
    tx.programs.create.mockResolvedValue(PROGRAM);
  });

  it('seeds the default stock for the new program in the same transaction', async () => {
    const result = await service.create(dto, USER_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(inventoryService.seedDefaultStock).toHaveBeenCalledWith(
      tx,
      PROGRAM.id,
      USER_ID,
    );
    expect(result).toBe(PROGRAM);
  });

  it('does not create the program when the default stock cannot be saved', async () => {
    inventoryService.seedDefaultStock.mockRejectedValue(new Error('boom'));

    await expect(service.create(dto, USER_ID)).rejects.toThrow('boom');
    // The error leaves the transaction callback, so Prisma rolls the program back.
    expect(tx.programs.create).toHaveBeenCalledTimes(1);
  });

  it('does not seed anything when the program already exists', async () => {
    prisma.programs.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.create(dto, USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(inventoryService.seedDefaultStock).not.toHaveBeenCalled();
  });
});
