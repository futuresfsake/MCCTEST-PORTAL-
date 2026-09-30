import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { batch_status_enum } from '../../../../generated/prisma/client';

export class UpdateBatchDto {
  /**
   * Trainer can be reassigned on any status (non-critical field).
   */
  @IsUUID()
  @IsOptional()
  trainer_id?: string;

  /**
   * Batch name is considered non-critical — editable even on ONGOING/CLOSED.
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  batch_name?: string;

  /**
   * Capacity is restricted: cannot reduce below current enrollment count.
   * Blocked for CLOSED/CANCELLED batches in service layer.
   */
  @IsInt()
  @IsPositive()
  @Min(0)
  @Max(25)
  @IsOptional()
  capacity?: number;

  /**
   * Date fields are critical — only editable on OPEN batches.
   */
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  /**
   * Venue and remarks are non-critical — always editable.
   */
  @IsString()
  @IsOptional()
  @MaxLength(255)
  venue?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class UpdateBatchStatusDto {
  @IsEnum(batch_status_enum)
  batch_status?: batch_status_enum;
}