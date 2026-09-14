import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { enrollment_status_enum } from '../../../../generated/prisma/enums';

/**
 * DTO for updating an enrollment status
 */
export class UpdateEnrollmentStatusDto {
  @IsEnum(enrollment_status_enum)
  status: enrollment_status_enum;

  @IsOptional()
  @IsString()
  remarks?: string;
}

/**
 * DTO for querying/filtering enrollments
 */
export class EnrollmentFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsEnum(enrollment_status_enum)
  status?: enrollment_status_enum;

  @IsOptional()
  @IsDateString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  endDate?: string; // YYYY-MM-DD

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
