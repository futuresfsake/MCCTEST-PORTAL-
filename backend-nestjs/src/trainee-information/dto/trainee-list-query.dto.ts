import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';
import {
  batch_status_enum,
  enrollment_status_enum,
  gender_enum,
} from '../../generated/prisma/enums';

export const TRAINEE_SORT_FIELDS = ['name', 'enrolledAt', 'idCard'] as const;
export type TraineeSortField = (typeof TRAINEE_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PROGRAM_TYPES = ['ACCREDITED', 'NON_ACCREDITED'] as const;
export type ProgramType = (typeof PROGRAM_TYPES)[number];

/** ACTIVE: insurance covers today. NONE: no coverage today. */
export const INSURANCE_FILTERS = ['ACTIVE', 'NONE'] as const;
export type InsuranceFilter = (typeof INSURANCE_FILTERS)[number];

/** COMPLETE: every required document submitted for the enrollment. */
export const REQUIREMENT_FILTERS = ['COMPLETE', 'INCOMPLETE'] as const;
export type RequirementFilter = (typeof REQUIREMENT_FILTERS)[number];

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 10;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Highest page number accepted; keeps OFFSET (page x limit) bounded. */
export const MAX_PAGE = 10000;

/** Fails when this YYYY-MM-DD field is earlier than the one named by `other`. */
function IsNotBefore(other: string) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isNotBefore',
      target: target.constructor,
      propertyName,
      constraints: [other],
      validator: {
        // ISO dates compare correctly as strings
        validate(value: unknown, args: ValidationArguments) {
          const earlier = (args.object as Record<string, unknown>)[other];
          return (
            typeof value !== 'string' ||
            typeof earlier !== 'string' ||
            value >= earlier
          );
        },
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must not be before ${other}`,
      },
    });
}

/**
 * Query string for GET /admin/trainees and GET /registrar/trainees.
 * Every field is optional; unknown fields are stripped by the global
 * ValidationPipe (whitelist).
 */
export class TraineeListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  /** Name (any word order), username, email, contact, ID card or OR number. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsEnum(enrollment_status_enum)
  enrollmentStatus?: enrollment_status_enum;

  @IsOptional()
  @IsEnum(batch_status_enum)
  batchStatus?: batch_status_enum;

  /** Enrolled on or after this day (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'dateFrom must be YYYY-MM-DD' })
  dateFrom?: string;

  /** Enrolled on or before this day (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY, { message: 'dateTo must be YYYY-MM-DD' })
  @IsNotBefore('dateFrom')
  dateTo?: string;

  @IsOptional()
  @IsIn(PROGRAM_TYPES)
  programType?: ProgramType;

  @IsOptional()
  @IsEnum(gender_enum)
  gender?: gender_enum;

  @IsOptional()
  @IsIn(INSURANCE_FILTERS)
  insurance?: InsuranceFilter;

  @IsOptional()
  @IsIn(REQUIREMENT_FILTERS)
  requirements?: RequirementFilter;

  @IsOptional()
  @IsIn(TRAINEE_SORT_FIELDS)
  sortBy: TraineeSortField = 'enrolledAt';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'desc';
}
