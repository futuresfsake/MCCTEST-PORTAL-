import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateProgramScheduleDto {
  @IsString()
  @MaxLength(50)
  schedule_name!: string;

  @IsArray()
  @IsString({ each: true })
  days!: string[];

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'start_time must be in HH:MM:SS format',
  })
  start_time!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: 'end_time must be in HH:MM:SS format',
  })
  end_time!: string;
}

export class CreateProgramDto {
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsString()
  @MaxLength(20)
  program_code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_accredited?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total_training_hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  approx_months?: string;

  @IsString()
  @MaxLength(20)
  control_number_prefix!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProgramScheduleDto)
  schedules?: CreateProgramScheduleDto[];
}