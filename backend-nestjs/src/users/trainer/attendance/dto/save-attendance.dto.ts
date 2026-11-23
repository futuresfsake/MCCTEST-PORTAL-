import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { attendance_status_enum } from '../../../../generated/prisma/client';

export class AttendanceEntryDto {
  @IsUUID()
  enrollmentId!: string;

  @IsEnum(attendance_status_enum)
  status!: attendance_status_enum;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  remark?: string;
}

export class SaveAttendanceDto {
  @IsDateString()
  sessionDate!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  hours!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  topics?: string;
}
