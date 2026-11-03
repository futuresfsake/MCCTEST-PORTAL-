import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_ITEM_NAME,
  InventoryService,
  UNIFORM_SIZES,
} from './inventory.service';

const PROGRAM_ID = '11111111-1111-4111-8111-111111111111';

function makeRow(index: number) {
  return {
    id: `row-${index}`,
    created_at: new Date(Date.UTC(2026, 10, 3, 12, 0, 60 - index)),
  };
}

describe('InventoryService history and last restocked', () => {
  const prisma = {
    $transaction: jest.fn(),
    inventory: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    inventory_transactions: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
  };
  const service = new InventoryService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    );
  });

  describe('program-level history', () => {
    it('filters by program, type and date range in the database', async () => {
      prisma.inventory_transactions.findMany.mockResolvedValue([]);

      await service.getProgramHistory({
        programId: PROGRAM_ID,
        type: 'DISTRIBUTED',
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
      });

      const args = prisma.inventory_transactions.findMany.mock.calls[0][0];
      expect(args.where).toEqual({
        inventory: { program_id: PROGRAM_ID },
        type: 'DISTRIBUTED',
        created_at: {
          gte: new Date('2026-11-01T00:00:00.000Z'),
          lt: new Date('2026-11-08T00:00:00.000Z'),
        },
      });
      expect(args.orderBy).toEqual([{ created_at: 'desc' }, { id: 'desc' }]);
    });

    it('applies no filters when none are given', async () => {
      prisma.inventory_transactions.findMany.mockResolvedValue([]);

      await service.getProgramHistory({});

      expect(
        prisma.inventory_transactions.findMany.mock.calls[0][0].where,
      ).toEqual({});
    });

    it('returns the next cursor only when another page exists', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => makeRow(i));
      prisma.inventory_transactions.findMany.mockResolvedValue(rows);

      const result = await service.getProgramHistory({});

      expect(result.data).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('row-19');
    });

    it('rejects a cursor that does not belong to the filtered log', async () => {
      prisma.inventory_transactions.findFirst.mockResolvedValue(null);

      await expect(
        service.getProgramHistory({
          programId: PROGRAM_ID,
          cursor: '22222222-2222-4222-8222-222222222222',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.inventory_transactions.findMany).not.toHaveBeenCalled();
    });

    it('selects the staff member, recipient and item without the password hash', async () => {
      prisma.inventory_transactions.findMany.mockResolvedValue([]);

      await service.getProgramHistory({});

      const select = prisma.inventory_transactions.findMany.mock.calls[0][0]
        .select as Record<string, unknown>;
      expect(select.users).toEqual({
        select: { id: true, first_name: true, last_name: true, role: true },
      });
      expect(select).toHaveProperty('enrollments');
      expect(select).toHaveProperty('inventory');
      expect(JSON.stringify(select)).not.toContain('password');
      expect(JSON.stringify(select)).not.toContain('email');
    });
  });

  describe('item history', () => {
    it('scopes the log to one inventory row', async () => {
      prisma.inventory.findUnique.mockResolvedValue({ id: 'item-1' });
      prisma.inventory_transactions.findMany.mockResolvedValue([]);

      await service.getHistory('item-1');

      expect(
        prisma.inventory_transactions.findMany.mock.calls[0][0].where,
      ).toEqual({ inventory_id: 'item-1' });
    });
  });

  describe('last restocked', () => {
    const items = [
      { id: 'a', quantity: 3 },
      { id: 'b', quantity: 0 },
    ];

    it('adds the latest restock date with one grouped query for the page', async () => {
      const restockedAt = new Date('2026-11-02T08:00:00.000Z');
      prisma.inventory.findMany.mockResolvedValue(items);
      prisma.inventory.count.mockResolvedValue(2);
      prisma.inventory_transactions.groupBy.mockResolvedValue([
        { inventory_id: 'a', _max: { created_at: restockedAt } },
      ]);

      const result = await service.findAll({ page: 1, limit: 20 } as never);

      expect(prisma.inventory_transactions.groupBy).toHaveBeenCalledTimes(1);
      const args = prisma.inventory_transactions.groupBy.mock.calls[0][0];
      expect(args.where.inventory_id).toEqual({ in: ['a', 'b'] });
      expect(args.where.type).toBe('RESTOCK');
      expect(result.data[0].last_restocked_at).toEqual(restockedAt);
      expect(result.data[1].last_restocked_at).toBeNull();
    });

    it('skips the restock query when the page is empty', async () => {
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);

      const result = await service.findAll({ page: 1, limit: 20 } as never);

      expect(prisma.inventory_transactions.groupBy).not.toHaveBeenCalled();
      expect(result.data).toEqual([]);
    });
  });
});

describe('InventoryService.deductAndLog', () => {
  const service = new InventoryService({} as never);
  const create = jest.fn();
  const queryRaw = jest.fn();
  const tx = { $queryRaw: queryRaw, inventory_transactions: { create } };

  beforeEach(() => {
    create.mockReset();
    queryRaw.mockReset();
  });

  it('takes one unit and logs a DISTRIBUTED row linked to the enrollment', async () => {
    queryRaw.mockResolvedValue([{ id: 'inv-1', quantity: 4 }]);

    const inventoryId = await service.deductAndLog(
      tx as never,
      PROGRAM_ID,
      'M',
      'enrollment-1',
      'user-1',
    );

    expect(inventoryId).toBe('inv-1');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data).toMatchObject({
      inventory_id: 'inv-1',
      type: 'DISTRIBUTED',
      quantity_change: -1,
      quantity_after: 4,
      enrollment_id: 'enrollment-1',
      performed_by: 'user-1',
    });
  });

  it('refuses with an out-of-stock message and writes no log when nothing is left', async () => {
    queryRaw.mockResolvedValue([]);

    await expect(
      service.deductAndLog(
        tx as never,
        PROGRAM_ID,
        'M',
        'enrollment-1',
        'user-1',
      ),
    ).rejects.toThrow('No M uniform is currently in stock for this program.');
    expect(create).not.toHaveBeenCalled();
  });
});

describe('InventoryService.seedDefaultStock', () => {
  const service = new InventoryService({} as never);
  const createManyAndReturn = jest.fn();
  const createMany = jest.fn();
  const tx = {
    inventory: { createManyAndReturn },
    inventory_transactions: { createMany },
  };

  beforeEach(() => {
    createManyAndReturn.mockReset();
    createMany.mockReset();
  });

  it('creates one row per size at quantity 0 for the program', async () => {
    createManyAndReturn.mockResolvedValue(
      UNIFORM_SIZES.map((_, i) => ({ id: `inv-${i}` })),
    );

    await service.seedDefaultStock(tx as never, PROGRAM_ID, 'user-1');

    const { data } = createManyAndReturn.mock.calls[0][0];
    expect(UNIFORM_SIZES).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
    expect(data).toHaveLength(7);
    expect(data.map((row: { sizes: string }) => row.sizes)).toEqual(
      UNIFORM_SIZES,
    );
    for (const row of data) {
      expect(row).toMatchObject({
        program_id: PROGRAM_ID,
        item_name: DEFAULT_ITEM_NAME,
        quantity: 0,
        updated_by: 'user-1',
      });
    }
  });

  it('writes an INITIAL history entry of 0 for every new row', async () => {
    createManyAndReturn.mockResolvedValue(
      UNIFORM_SIZES.map((_, i) => ({ id: `inv-${i}` })),
    );

    await service.seedDefaultStock(tx as never, PROGRAM_ID, 'user-1');

    const { data } = createMany.mock.calls[0][0];
    expect(data).toHaveLength(7);
    expect(
      data.map((row: { inventory_id: string }) => row.inventory_id),
    ).toEqual(UNIFORM_SIZES.map((_, i) => `inv-${i}`));
    for (const row of data) {
      expect(row).toMatchObject({
        type: 'INITIAL',
        quantity_change: 0,
        quantity_after: 0,
        performed_by: 'user-1',
      });
    }
  });
});

describe('InventoryService.getSummary', () => {
  const queryRaw = jest.fn();
  const service = new InventoryService({ $queryRaw: queryRaw } as never);

  it('returns the totals as numbers and the quantity and level of every size', async () => {
    queryRaw.mockResolvedValue([
      {
        program_id: PROGRAM_ID,
        program_name: 'Welding',
        total_units: BigInt(18),
        total_items: BigInt(7),
        low_stock_items: BigInt(1),
        out_of_stock_items: BigInt(5),
        sizes: {
          XS: { quantity: 0, level: 'out_of_stock' },
          M: { quantity: 11, level: 'in_stock' },
          L: { quantity: 7, level: 'in_stock' },
        },
      },
    ]);

    const [program] = await service.getSummary();

    expect(program).toMatchObject({
      program_id: PROGRAM_ID,
      total_units: 18,
      total_items: 7,
      low_stock_items: 1,
      out_of_stock_items: 5,
    });
    expect(program.sizes.M).toEqual({ quantity: 11, level: 'in_stock' });
    expect(program.sizes.XS.level).toBe('out_of_stock');
  });

  it('uses the shared low-stock threshold for the per-size level', async () => {
    queryRaw.mockResolvedValue([]);

    await service.getSummary();

    // Tagged-template call: the first argument is the SQL parts, then the values.
    const values = queryRaw.mock.calls[0].slice(1);
    expect(values).toEqual([5, 5]);
  });
});
