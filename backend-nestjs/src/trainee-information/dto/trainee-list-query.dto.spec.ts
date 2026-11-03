import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  MAX_PAGE_SIZE,
  MAX_PAGE,
  TraineeListQueryDto,
} from './trainee-list-query.dto';

async function errorsFor(query: Record<string, unknown>) {
  const dto = plainToInstance(TraineeListQueryDto, query);
  const errors = await validate(dto, { whitelist: true });
  return errors.map((error) => error.property);
}

describe('TraineeListQueryDto', () => {
  it('accepts an empty query and applies defaults', async () => {
    const dto = plainToInstance(TraineeListQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      page: 1,
      limit: 10,
      sortBy: 'enrolledAt',
      sortOrder: 'desc',
    });
  });

  it('rejects a limit above the cap', async () => {
    expect(await errorsFor({ limit: MAX_PAGE_SIZE + 1 })).toContain('limit');
  });

  it('rejects page 0 and pages above the cap', async () => {
    expect(await errorsFor({ page: 0 })).toContain('page');
    expect(await errorsFor({ page: MAX_PAGE + 1 })).toContain('page');
  });

  it('rejects unknown sort fields and malformed ids', async () => {
    expect(await errorsFor({ sortBy: 'password_hash' })).toContain('sortBy');
    expect(await errorsFor({ programId: 'not-a-uuid' })).toContain('programId');
  });

  it('rejects a search longer than 100 characters', async () => {
    expect(await errorsFor({ search: 'a'.repeat(101) })).toContain('search');
  });

  it('accepts dateTo on or after dateFrom', async () => {
    expect(
      await errorsFor({ dateFrom: '2026-10-01', dateTo: '2026-10-01' }),
    ).toHaveLength(0);
    expect(
      await errorsFor({ dateFrom: '2026-10-01', dateTo: '2026-10-31' }),
    ).toHaveLength(0);
  });

  it('rejects dateTo before dateFrom', async () => {
    expect(
      await errorsFor({ dateFrom: '2026-10-31', dateTo: '2026-10-01' }),
    ).toContain('dateTo');
  });

  it('allows either date on its own', async () => {
    expect(await errorsFor({ dateFrom: '2026-10-31' })).toHaveLength(0);
    expect(await errorsFor({ dateTo: '2026-10-01' })).toHaveLength(0);
  });
});
