import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { enrollment_status_enum } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  BULK_MAX_ROWS,
  BULK_MAX_ROWS_MESSAGE,
  EDITABLE_DOCUMENT_KEYS,
  HISTORY_PAGE_SIZE,
  REQUIREMENT_DOCUMENTS,
  REQUIREMENT_DOCUMENT_KEYS,
  REQUIREMENT_TOTAL,
  RequirementDocumentKey,
  STALE_CHECKLIST_MESSAGE,
} from './requirements.constants';
import {
  BulkRequirementDto,
  RequirementDetailQueryDto,
  RequirementListQueryDto,
  UpdateRequirementDto,
} from './dto/requirements.dto';

type DocumentFlags = Record<RequirementDocumentKey, boolean>;

/** SQL: number of missing documents; an enrollment with no checklist misses all. */
const MISSING_COUNT_SQL = Prisma.sql`CASE WHEN rc.id IS NULL THEN ${REQUIREMENT_TOTAL}::int ELSE ${Prisma.join(
  REQUIREMENT_DOCUMENT_KEYS.map(
    (k) => Prisma.sql`(NOT rc.${Prisma.raw(k)})::int`,
  ),
  ' + ',
)} END`;

const LIST_FROM_SQL = Prisma.sql`
  FROM enrollments e
  JOIN batch b ON b.id = e.batch_id
  JOIN programs p ON p.id = b.program_id
  JOIN trainee t ON t.id = e.trainee_id
  LEFT JOIN users u ON u.id = t.users_id
  LEFT JOIN requirement_checklist rc ON rc.enrollment_id = e.id`;

const checklistSelect = {
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
  users: { select: { first_name: true, last_name: true } },
} satisfies Prisma.requirement_checklistSelect;

export type ChecklistRow = Prisma.requirement_checklistGetPayload<{
  select: typeof checklistSelect;
}>;

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function fullName(
  user: { first_name: string; last_name: string } | null | undefined,
) {
  return user ? `${user.first_name} ${user.last_name}`.trim() : null;
}

function flagsOf(
  row: Partial<Record<RequirementDocumentKey, boolean>> | null,
): DocumentFlags {
  const flags = {} as DocumentFlags;
  for (const key of REQUIREMENT_DOCUMENT_KEYS) flags[key] = row?.[key] ?? false;
  return flags;
}

function progressOf(flags: DocumentFlags) {
  const missing = REQUIREMENT_DOCUMENT_KEYS.filter((k) => !flags[k]);
  return {
    submitted: REQUIREMENT_TOTAL - missing.length,
    total: REQUIREMENT_TOTAL,
    missing,
  };
}

function traineeLabel(
  user: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
  } | null,
) {
  return user
    ? `${user.last_name}, ${user.first_name} ${user.middle_name ?? ''}`.trim()
    : '';
}

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- list

  async getList(query: RequirementListQueryDto) {
    const take = query.take ?? 10;
    const skip = query.skip ?? 0;
    const completion = query.completion ?? 'incomplete';

    const filters = this.buildFilters(query);
    const countsWhere = filters.length
      ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
      : Prisma.empty;

    const pageFilters = [...filters];
    if (completion === 'complete') {
      pageFilters.push(Prisma.sql`(${MISSING_COUNT_SQL}) = 0`);
    } else if (completion === 'incomplete') {
      pageFilters.push(Prisma.sql`(${MISSING_COUNT_SQL}) > 0`);
    }
    const pageWhere = pageFilters.length
      ? Prisma.sql`WHERE ${Prisma.join(pageFilters, ' AND ')}`
      : Prisma.empty;

    const [counts, idRows] = await Promise.all([
      this.prisma.$queryRaw<{ complete: bigint; incomplete: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE (${MISSING_COUNT_SQL}) = 0) AS complete,
          COUNT(*) FILTER (WHERE (${MISSING_COUNT_SQL}) > 0) AS incomplete
        ${LIST_FROM_SQL} ${countsWhere}`,
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT e.id ${LIST_FROM_SQL} ${pageWhere}
        ORDER BY ${this.orderBy(query.sort)}
        LIMIT ${take} OFFSET ${skip}`,
    ]);

    const complete = Number(counts[0]?.complete ?? 0);
    const incomplete = Number(counts[0]?.incomplete ?? 0);
    const total =
      completion === 'complete'
        ? complete
        : completion === 'incomplete'
          ? incomplete
          : complete + incomplete;

    const ids = idRows.map((r) => r.id);
    const rows = ids.length
      ? await this.prisma.enrollments.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            enrollment_status: true,
            id_card_number: true,
            batch: {
              select: {
                id: true,
                batch_name: true,
                start_date: true,
                programs: { select: { id: true, name: true } },
              },
            },
            trainee: {
              select: {
                users: {
                  select: {
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    system_id: true,
                  },
                },
              },
            },
            requirement_checklist: {
              select: {
                bc_nso_psa_copy: true,
                diploma_tor: true,
                brgy_clearance: true,
                one_by_one_pic: true,
                two_by_two_pic: true,
                passport_size: true,
                commitment_fee: true,
                checked_at: true,
                users: { select: { first_name: true, last_name: true } },
              },
            },
          },
        })
      : [];

    const byId = new Map(rows.map((r) => [r.id, r]));
    const data = ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const flags = flagsOf(row.requirement_checklist);
      const trainee = row.trainee.users;
      return [
        {
          enrollmentId: row.id,
          traineeName: traineeLabel(trainee),
          systemId: trainee?.system_id ?? null,
          idCardNumber: row.id_card_number,
          program: row.batch.programs,
          batch: {
            id: row.batch.id,
            name: row.batch.batch_name,
            startDate: row.batch.start_date,
          },
          enrollmentStatus: row.enrollment_status,
          documents: flags,
          ...progressOf(flags),
          checkedBy: fullName(row.requirement_checklist?.users),
          checkedAt: row.requirement_checklist?.checked_at ?? null,
        },
      ];
    });

    return { data, total, skip, take, counts: { complete, incomplete } };
  }

  private orderBy(sort: RequirementListQueryDto['sort']) {
    switch (sort) {
      case 'name':
        return Prisma.sql`u.last_name ASC, u.first_name ASC, e.id ASC`;
      case 'batchStart':
        return Prisma.sql`b.start_date DESC, e.id ASC`;
      case 'lastChecked':
        return Prisma.sql`rc.checked_at DESC NULLS LAST, e.id ASC`;
      default:
        return Prisma.sql`(${MISSING_COUNT_SQL}) DESC, u.last_name ASC, e.id ASC`;
    }
  }

  /** Every filter except completion, so the counts match the other filters. */
  private buildFilters(query: RequirementListQueryDto): Prisma.Sql[] {
    const filters: Prisma.Sql[] = [];

    const statuses = query.status?.length ? query.status : ['ENROLLED'];
    if (!statuses.includes('ALL')) {
      filters.push(
        Prisma.sql`e.enrollment_status = ANY(${statuses}::enrollment_status_enum[])`,
      );
    }

    if (query.programId) {
      filters.push(Prisma.sql`b.program_id = ${query.programId}::uuid`);
    }
    if (query.batchId) {
      filters.push(Prisma.sql`e.batch_id = ${query.batchId}::uuid`);
    }

    for (const doc of query.missing ?? []) {
      if (!REQUIREMENT_DOCUMENT_KEYS.includes(doc as RequirementDocumentKey)) {
        continue;
      }
      filters.push(Prisma.sql`(rc.id IS NULL OR NOT rc.${Prisma.raw(doc)})`);
    }

    const terms = (query.search ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);
    for (const term of terms) {
      const pattern = `%${escapeLike(term)}%`;
      filters.push(Prisma.sql`(
        u.first_name ILIKE ${pattern} OR u.middle_name ILIKE ${pattern}
        OR u.last_name ILIKE ${pattern} OR u.system_id ILIKE ${pattern}
        OR e.id_card_number ILIKE ${pattern})`);
    }

    if (query.checkedFrom) {
      filters.push(Prisma.sql`rc.checked_at >= ${new Date(query.checkedFrom)}`);
    }
    if (query.checkedTo) {
      const end = new Date(query.checkedTo);
      end.setDate(end.getDate() + 1);
      filters.push(Prisma.sql`rc.checked_at < ${end}`);
    }

    return filters;
  }

  // ------------------------------------------------------------- options

  async getFilterOptions() {
    const [programs, batches] = await Promise.all([
      this.prisma.programs.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.batch.findMany({
        select: { id: true, batch_name: true, program_id: true },
        orderBy: { batch_name: 'asc' },
      }),
    ]);

    return {
      programs,
      batches: batches.map((b) => ({
        id: b.id,
        name: b.batch_name,
        programId: b.program_id,
      })),
      statuses: Object.values(enrollment_status_enum),
      documents: REQUIREMENT_DOCUMENTS,
    };
  }

  // -------------------------------------------------------------- detail

  async getDetail(enrollmentId: string, query: RequirementDetailQueryDto) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        enrollment_status: true,
        id_card_number: true,
        batch: {
          select: { batch_name: true, programs: { select: { name: true } } },
        },
        trainee: {
          select: {
            users: {
              select: { first_name: true, middle_name: true, last_name: true },
            },
          },
        },
        requirement_checklist: { select: checklistSelect },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found.');

    const checklist = enrollment.requirement_checklist;
    const history = checklist
      ? await this.pageHistory(checklist.id, query.cursor)
      : { data: [], nextCursor: null };

    return {
      enrollmentId: enrollment.id,
      traineeName: traineeLabel(enrollment.trainee.users),
      idCardNumber: enrollment.id_card_number,
      program: enrollment.batch.programs.name,
      batch: enrollment.batch.batch_name,
      enrollmentStatus: enrollment.enrollment_status,
      checklist: this.toChecklistView(checklist),
      history,
    };
  }

  private toChecklistView(row: ChecklistRow | null) {
    const flags = flagsOf(row);
    return {
      documents: flags,
      ...progressOf(flags),
      remarks: row?.remarks ?? null,
      checkedBy: fullName(row?.users),
      checkedAt: row?.checked_at ?? null,
    };
  }

  private async pageHistory(checklistId: string, cursor?: string) {
    let cursorRow: { changed_at: Date; id: string } | null = null;
    if (cursor) {
      cursorRow = await this.prisma.requirement_checklist_history.findFirst({
        where: { requirement_checklist_id: checklistId, id: cursor },
        select: { changed_at: true, id: true },
      });
      if (!cursorRow) throw new BadRequestException('Invalid history cursor.');
    }

    const rows = await this.prisma.requirement_checklist_history.findMany({
      where: {
        requirement_checklist_id: checklistId,
        ...(cursorRow && {
          OR: [
            { changed_at: { lt: cursorRow.changed_at } },
            { changed_at: cursorRow.changed_at, id: { lt: cursorRow.id } },
          ],
        }),
      },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
      take: HISTORY_PAGE_SIZE + 1,
      select: {
        id: true,
        document: true,
        old_value: true,
        new_value: true,
        changed_at: true,
        remarks: true,
        users: { select: { first_name: true, last_name: true } },
      },
    });

    const hasMore = rows.length > HISTORY_PAGE_SIZE;
    const page = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;
    return {
      data: page.map((r) => ({
        id: r.id,
        document: r.document,
        oldValue: r.old_value,
        newValue: r.new_value,
        changedBy: fullName(r.users),
        changedAt: r.changed_at,
        remarks: r.remarks,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // -------------------------------------------------------------- update

  /** Saves one checklist and returns the view the Requirements page uses. */
  async update(
    enrollmentId: string,
    dto: UpdateRequirementDto,
    userId: string,
  ) {
    return this.toChecklistView(
      await this.saveChecklist(enrollmentId, dto, userId),
    );
  }

  /**
   * The one place a checklist is saved. Used by the Admin and Registrar
   * Requirements endpoints and by the enrollment detail endpoints.
   *
   * Saves the six editable documents and the remark, rejects a stale version
   * with 409 (when `expectedCheckedAt` is sent) and writes one history row per
   * changed document, all in one transaction. The commitment fee is a payment,
   * so it is never changed here.
   */
  async saveChecklist(
    enrollmentId: string,
    dto: UpdateRequirementDto,
    userId: string,
  ): Promise<ChecklistRow> {
    const next: Record<string, boolean> = {
      bc_nso_psa_copy: dto.bcNsoPsaCopy,
      diploma_tor: dto.diplomaTor,
      brgy_clearance: dto.brgyClearance,
      one_by_one_pic: dto.oneByOnePic,
      two_by_two_pic: dto.twoByTwoPic,
      passport_size: dto.passportSize,
    };

    try {
      return await this.prisma.$transaction(async (tx) => {
        const enrollment = await tx.enrollments.findUnique({
          where: { id: enrollmentId },
          select: { id: true },
        });
        if (!enrollment) throw new NotFoundException('Enrollment not found.');

        // Lock the row so two saves are serialised and the second sees the first.
        await tx.$queryRaw`SELECT id FROM requirement_checklist WHERE enrollment_id = ${enrollmentId}::uuid FOR UPDATE`;
        const current = await tx.requirement_checklist.findUnique({
          where: { enrollment_id: enrollmentId },
          select: checklistSelect,
        });

        if (dto.expectedCheckedAt !== undefined) {
          const expected = dto.expectedCheckedAt
            ? new Date(dto.expectedCheckedAt).getTime()
            : null;
          const actual = current ? current.checked_at.getTime() : null;
          if (expected !== actual) {
            throw new ConflictException(STALE_CHECKLIST_MESSAGE);
          }
        }

        const before = flagsOf(current);
        const changed = EDITABLE_DOCUMENT_KEYS.filter(
          (k) => before[k] !== next[k],
        );
        const remarks =
          dto.remarks === undefined ? undefined : dto.remarks.trim() || null;
        const remarksChanged =
          remarks !== undefined && remarks !== (current?.remarks ?? null);

        if (current && changed.length === 0 && !remarksChanged) {
          return current;
        }

        const checkedAt = new Date();
        const data = {
          ...next,
          ...(remarks !== undefined && { remarks }),
          checked_by: userId,
          checked_at: checkedAt,
        };

        const saved = current
          ? await tx.requirement_checklist.update({
              where: { id: current.id },
              data,
              select: checklistSelect,
            })
          : await tx.requirement_checklist.create({
              data: { enrollment_id: enrollmentId, ...data },
              select: checklistSelect,
            });

        if (changed.length > 0) {
          await tx.requirement_checklist_history.createMany({
            data: changed.map((doc) => ({
              requirement_checklist_id: saved.id,
              enrollment_id: enrollmentId,
              document: doc,
              old_value: before[doc],
              new_value: next[doc],
              changed_by: userId,
              changed_at: checkedAt,
              remarks: remarks ?? null,
            })),
          });
        }

        return saved;
      });
    } catch (error) {
      // Two first-time saves for the same enrollment race on the unique key.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(STALE_CHECKLIST_MESSAGE);
      }
      throw error;
    }
  }

  // ---------------------------------------------------------------- bulk

  /**
   * Marks one document as received for many enrollments. All or nothing, with
   * a fixed number of set-based statements (no per-row queries).
   */
  async bulkMarkReceived(dto: BulkRequirementDto, userId: string) {
    const ids = [...new Set(dto.enrollmentIds)];
    if (ids.length > BULK_MAX_ROWS) {
      throw new BadRequestException(BULK_MAX_ROWS_MESSAGE);
    }
    if (
      !EDITABLE_DOCUMENT_KEYS.includes(dto.document as RequirementDocumentKey)
    ) {
      throw new BadRequestException(
        'Unknown document, or it cannot be changed here.',
      );
    }
    const column = Prisma.raw(dto.document);

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM enrollments WHERE id = ANY(${ids}::uuid[])`;
      if (Number(found[0].count) !== ids.length) {
        throw new NotFoundException('One or more enrollments were not found.');
      }

      // Older enrollments may have no checklist yet.
      await tx.$executeRaw`
        INSERT INTO requirement_checklist (enrollment_id, checked_by)
        SELECT e.id, ${userId}::uuid FROM enrollments e
        WHERE e.id = ANY(${ids}::uuid[])
          AND NOT EXISTS (
            SELECT 1 FROM requirement_checklist rc WHERE rc.enrollment_id = e.id)
        ON CONFLICT (enrollment_id) DO NOTHING`;

      // History first: only rows where the document is currently missing.
      await tx.$executeRaw`
        INSERT INTO requirement_checklist_history
          (requirement_checklist_id, enrollment_id, document, old_value, new_value, changed_by)
        SELECT rc.id, rc.enrollment_id, ${dto.document}, FALSE, TRUE, ${userId}::uuid
        FROM requirement_checklist rc
        WHERE rc.enrollment_id = ANY(${ids}::uuid[]) AND NOT rc.${column}`;

      const updated = await tx.$executeRaw`
        UPDATE requirement_checklist
        SET ${column} = TRUE, checked_by = ${userId}::uuid, checked_at = now()
        WHERE enrollment_id = ANY(${ids}::uuid[]) AND NOT ${column}`;

      return {
        document: dto.document,
        requested: ids.length,
        updated,
        unchanged: ids.length - updated,
      };
    });
  }
}
