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
  Min,
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
  reason?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
