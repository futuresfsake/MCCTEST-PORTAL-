import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  size_enum,
  inventory_transaction_type_enum,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

import { CreateInventoryDto } from './dto/create-inventory.dto';
import { RestockInventoryDto } from './dto/restock-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';

const LOW_STOCK_THRESHOLD = 5;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const HISTORY_PAGE_SIZE = 20;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getStockLevel(quantity: number) {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= LOW_STOCK_THRESHOLD) return 'low_stock';
    return 'in_stock';
  }

  private async handlePrismaError(error: unknown): Promise<never> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'This item already exists, restock it instead.',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Inventory item not found.');
      }
    }

    throw error;
  }

  private validateSize(size: string): size_enum {
    if (!Object.values(size_enum).includes(size as size_enum)) {
      throw new BadRequestException(
        `Invalid size. Allowed sizes: ${Object.values(size_enum).join(', ')}`,
      );
    }

    return size as size_enum;
  }

  /**
   * GET /inventory
   * Server-side pagination, filtering, search, and sorting.
   */
  async findAll(query: QueryInventoryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(query.limit) || DEFAULT_LIMIT),
    );

    const search = query.search?.trim();

    const where: Prisma.inventoryWhereInput = {
      ...(query.programId && { program_id: query.programId }),
      ...(query.size && { sizes: this.validateSize(query.size) }),
      ...(search && {
        OR: [
          {
            item_name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            programs: {
              is: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      }),
    };

    if (query.stockLevel === 'in_stock') {
      where.quantity = { gt: LOW_STOCK_THRESHOLD };
    } else if (query.stockLevel === 'low') {
      where.quantity = {
        gt: 0,
        lte: LOW_STOCK_THRESHOLD,
      };
    } else if (query.stockLevel === 'out') {
      where.quantity = 0;
    }

    const direction = query.sortOrder === 'desc' ? 'desc' : 'asc';

    const orderBy: Prisma.inventoryOrderByWithRelationInput[] = (() => {
      switch (query.sortBy) {
        case 'item':
          return [{ item_name: direction }, { id: 'asc' }];
        case 'size':
          return [{ sizes: direction }, { id: 'asc' }];
        case 'quantity':
          return [{ quantity: direction }, { id: 'asc' }];
        case 'program':
        default:
          return [
            { programs: { name: direction } },
            { item_name: 'asc' },
            { sizes: 'asc' },
            { id: 'asc' },
          ];
      }
    })();

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        select: {
          id: true,
          program_id: true,
          item_name: true,
          sizes: true,
          quantity: true,
          updated_at: true,
          programs: {
            select: {
              id: true,
              name: true,
            },
          },
          users: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        stock_level: this.getStockLevel(item.quantity),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /inventory/summary
   * Aggregate stock information in PostgreSQL.
   */
  async getSummary() {
    const rows = await this.prisma.$queryRaw<
      Array<{
        program_id: string;
        program_name: string;
        total_units: bigint;
        total_items: bigint;
        low_stock_items: bigint;
        out_of_stock_items: bigint;
      }>
    >`
      SELECT
        p.id AS program_id,
        p.name AS program_name,
        COALESCE(SUM(i.quantity), 0)::bigint AS total_units,
        COUNT(i.id)::bigint AS total_items,
        COUNT(i.id) FILTER (
          WHERE i.quantity > 0 AND i.quantity <= ${LOW_STOCK_THRESHOLD}
        )::bigint AS low_stock_items,
        COUNT(i.id) FILTER (
          WHERE i.quantity = 0
        )::bigint AS out_of_stock_items
      FROM programs p
      LEFT JOIN inventory i ON i.program_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.name ASC
    `;

    return rows.map((row) => ({
      program_id: row.program_id,
      program_name: row.program_name,
      total_units: Number(row.total_units),
      total_items: Number(row.total_items),
      low_stock_items: Number(row.low_stock_items),
      out_of_stock_items: Number(row.out_of_stock_items),
    }));
  }

  /**
   * GET /inventory/availability?programId=...&size=M
   * Lightweight query for the enrollment wizard.
   */
  async getAvailability(programId: string, size: string) {
    const validSize = this.validateSize(size);

    const result = await this.prisma.inventory.aggregate({
      where: {
        program_id: programId,
        sizes: validSize,
      },
      _sum: {
        quantity: true,
      },
    });

    return {
      program_id: programId,
      size: validSize,
      available_quantity: result._sum.quantity ?? 0,
    };
  }

  /**
   * POST /inventory
   * Create an item and its INITIAL history entry atomically.
   */
  async create(dto: CreateInventoryDto, userId: string) {
    const size = this.validateSize(dto.sizes);

    if (!Number.isInteger(dto.quantity) || dto.quantity < 0) {
      throw new BadRequestException(
        'Starting quantity must be a non-negative whole number.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.inventory.create({
          data: {
            program_id: dto.program_id,
            item_name: 'Uniform Shirt',
            sizes: size,
            quantity: dto.quantity,
            updated_by: userId,
          },
          select: {
            id: true,
            program_id: true,
            item_name: true,
            sizes: true,
            quantity: true,
            updated_at: true,
          },
        });

        await tx.inventory_transactions.create({
          data: {
            inventory_id: item.id,
            type: inventory_transaction_type_enum.INITIAL,
            quantity_change: dto.quantity,
            quantity_after: item.quantity,
            performed_by: userId,
            remarks: 'Opening balance',
          },
        });

        return {
          ...item,
          stock_level: this.getStockLevel(item.quantity),
        };
      });
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  /**
   * POST /inventory/:id/restock
   * Atomic increment + log in one transaction.
   */
  async restock(id: string, dto: RestockInventoryDto, userId: string) {
    if (!Number.isInteger(dto.quantity) || dto.quantity <= 0) {
      throw new BadRequestException(
        'Restock quantity must be a positive whole number.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // PostgreSQL UPDATE ... RETURNING captures the quantity produced
        // by this exact atomic update, including under concurrent restocks.
        const updated = await tx.$queryRaw<
          Array<{ id: string; quantity: number }>
        >`
          UPDATE inventory
          SET
            quantity = quantity + ${dto.quantity},
            updated_by = ${userId}::uuid,
            updated_at = NOW()
          WHERE id = ${id}::uuid
          RETURNING id, quantity
        `;

        if (updated.length === 0) {
          throw new NotFoundException('Inventory item not found.');
        }

        const item = updated[0];

        await tx.inventory_transactions.create({
          data: {
            inventory_id: item.id,
            type: inventory_transaction_type_enum.RESTOCK,
            quantity_change: dto.quantity,
            quantity_after: item.quantity,
            performed_by: userId,
            remarks: dto.remarks?.trim() || null,
          },
        });

        return {
          id: item.id,
          quantity: item.quantity,
          stock_level: this.getStockLevel(item.quantity),
        };
      });
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  /**
   * POST /inventory/:id/adjust
   * Positive change adds stock; negative change removes stock.
   * Zero is not a stock adjustment.
   */
  async adjust(id: string, dto: AdjustInventoryDto, userId: string) {
    const change = dto.quantity_change;
    const reason = dto.reason?.trim();

    if (!Number.isInteger(change) || change === 0) {
      throw new BadRequestException(
        'Adjustment must be a non-zero whole number.',
      );
    }

    if (!reason) {
      throw new BadRequestException('An adjustment reason is required.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.$queryRaw<
          Array<{ id: string; quantity: number }>
        >`
          UPDATE inventory
          SET
            quantity = quantity + ${change},
            updated_by = ${userId}::uuid,
            updated_at = NOW()
          WHERE id = ${id}::uuid
            AND quantity + ${change} >= 0
          RETURNING id, quantity
        `;

        if (updated.length === 0) {
          const existing = await tx.inventory.findUnique({
            where: { id },
            select: { id: true },
          });

          if (!existing) {
            throw new NotFoundException('Inventory item not found.');
          }

          throw new BadRequestException(
            'Adjustment would make stock negative.',
          );
        }

        const item = updated[0];

        await tx.inventory_transactions.create({
          data: {
            inventory_id: item.id,
            type: inventory_transaction_type_enum.ADJUSTMENT,
            quantity_change: change,
            quantity_after: item.quantity,
            performed_by: userId,
            remarks: reason,
          },
        });

        return {
          id: item.id,
          quantity: item.quantity,
          stock_level: this.getStockLevel(item.quantity),
        };
      });
    } catch (error) {
      return this.handlePrismaError(error);
    }
  }

  /**
   * GET /inventory/:id/history?cursor=<transaction UUID>
   * Newest first, with stable (created_at, id) keyset pagination.
   */
  async getHistory(id: string, cursor?: string) {
    const inventoryItem = await this.prisma.inventory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found.');
    }

    let cursorFilter: Prisma.inventory_transactionsWhereInput = {
      inventory_id: id,
    };

    if (cursor) {
      const cursorRow = await this.prisma.inventory_transactions.findFirst({
        where: {
          id: cursor,
          inventory_id: id,
        },
        select: {
          id: true,
          created_at: true,
        },
      });

      if (!cursorRow) {
        throw new BadRequestException('Invalid history cursor.');
      }

      cursorFilter = {
        inventory_id: id,
        OR: [
          { created_at: { lt: cursorRow.created_at } },
          {
            created_at: cursorRow.created_at,
            id: { lt: cursorRow.id },
          },
        ],
      };
    }

    const rows = await this.prisma.inventory_transactions.findMany({
      where: cursorFilter,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: HISTORY_PAGE_SIZE + 1,
      select: {
        id: true,
        type: true,
        quantity_change: true,
        quantity_after: true,
        enrollment_id: true,
        remarks: true,
        created_at: true,
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    const hasMore = rows.length > HISTORY_PAGE_SIZE;
    const data = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Deduct one uniform and log the distribution.
   * Must be called with the same transaction as enrollment creation.
   */
  async deductAndLog(
    tx: Prisma.TransactionClient,
    programId: string,
    size: size_enum,
    enrollmentId: string,
    userId: string,
  ): Promise<string> {
    const updated = await tx.$queryRaw<Array<{ id: string; quantity: number }>>`
        WITH candidate AS (
        SELECT id
        FROM inventory
        WHERE program_id = ${programId}::uuid
            AND sizes = ${size}::size_enum
            AND quantity > 0
        ORDER BY updated_at ASC, id ASC
        LIMIT 1
        FOR UPDATE
        )
        UPDATE inventory AS i
        SET
        quantity = i.quantity - 1,
        updated_by = ${userId}::uuid,
        updated_at = NOW()
        FROM candidate
        WHERE i.id = candidate.id
        AND i.quantity > 0
        RETURNING i.id, i.quantity
    `;

    if (updated.length === 0) {
      throw new BadRequestException(
        `No ${size} uniform is currently in stock for this program.`,
      );
    }

    const item = updated[0];

    await tx.inventory_transactions.create({
      data: {
        inventory_id: item.id,
        type: inventory_transaction_type_enum.DISTRIBUTED,
        quantity_change: -1,
        quantity_after: item.quantity,
        enrollment_id: enrollmentId,
        performed_by: userId,
        remarks: 'Uniform distributed during enrollment',
      },
    });

    return item.id;
  }
}
