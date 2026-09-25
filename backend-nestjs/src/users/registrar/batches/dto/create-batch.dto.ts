import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBatchDto {
  @IsUUID()
  @IsNotEmpty()
  program_id?: string;

  @IsUUID()
  @IsNotEmpty()
  trainer_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  batch_name?: string;

  @IsInt()
  @IsPositive()
  @Min(0)
  @Max(25)
  capacity?: number;

  @IsDateString()
  start_date?: string;

  @IsDateString()
  end_date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  venue?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}