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

/** `ALL` shows every status. Left out, the list shows what needs the trainer. */
export const TRAINER_STATUS_FILTERS = [
  ...Object.values(withdrawal_status_enum),
  'ALL',
] as const;
export type TrainerStatusFilter = (typeof TRAINER_STATUS_FILTERS)[number];

export class TrainerWithdrawalQueryDto {
  @IsOptional()
  @IsIn(TRAINER_STATUS_FILTERS)
  status?: TrainerStatusFilter;

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
