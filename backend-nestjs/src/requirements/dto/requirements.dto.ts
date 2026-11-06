import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { enrollment_status_enum } from '../../generated/prisma/enums';
import {
  BULK_MAX_ROWS,
  BULK_MAX_ROWS_MESSAGE,
  REQUIREMENT_DOCUMENT_KEYS,
} from '../requirements.constants';

function toArray(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  return Array.isArray(value) ? value : [value];
}

export const REQUIREMENT_SORTS = [
  'missing',
  'name',
  'batchStart',
  'lastChecked',
] as const;

export class RequirementListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(['all', 'complete', 'incomplete'])
  completion?: 'all' | 'complete' | 'incomplete';

  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsIn(REQUIREMENT_DOCUMENT_KEYS, { each: true })
  missing?: string[];

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  /** Defaults to ENROLLED. Use "ALL" for every status. */
  @IsOptional()
  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsIn([...Object.values(enrollment_status_enum), 'ALL'], { each: true })
  status?: string[];

  @IsOptional()
  @IsDateString()
  checkedFrom?: string;

  @IsOptional()
  @IsDateString()
  checkedTo?: string;

  @IsOptional()
  @IsIn(REQUIREMENT_SORTS)
  sort?: (typeof REQUIREMENT_SORTS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class RequirementDetailQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;
}

export class UpdateRequirementDto {
  @IsBoolean() bcNsoPsaCopy!: boolean;
  @IsBoolean() diplomaTor!: boolean;
  @IsBoolean() brgyClearance!: boolean;
  @IsBoolean() oneByOnePic!: boolean;
  @IsBoolean() twoByTwoPic!: boolean;
  @IsBoolean() passportSize!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  /** The checked_at the editor loaded (null/omitted when no checklist existed). */
  @IsOptional()
  @IsDateString()
  expectedCheckedAt?: string | null;
}

export class BulkRequirementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_MAX_ROWS, { message: BULK_MAX_ROWS_MESSAGE })
  @IsUUID('all', { each: true })
  enrollmentIds!: string[];

  @IsIn(REQUIREMENT_DOCUMENT_KEYS)
  document!: string;
}
