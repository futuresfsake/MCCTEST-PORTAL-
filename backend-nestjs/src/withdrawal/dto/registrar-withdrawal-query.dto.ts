import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { withdrawal_status_enum } from '../../generated/prisma/client';

/** A single status, or `ALL`. Left out, the list shows what waits for the registrar. */
export const REGISTRAR_STATUS_FILTERS = [
  ...Object.values(withdrawal_status_enum),
  'ALL',
] as const;
export type RegistrarStatusFilter = (typeof REGISTRAR_STATUS_FILTERS)[number];

export class RegistrarWithdrawalQueryDto {
  @IsOptional()
  @IsIn(REGISTRAR_STATUS_FILTERS)
  status?: RegistrarStatusFilter;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
