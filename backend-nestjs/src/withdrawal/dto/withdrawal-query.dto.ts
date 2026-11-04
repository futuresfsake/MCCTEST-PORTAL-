import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { withdrawal_status_enum } from '../../generated/prisma/client';

export class WithdrawalQueryDto {
  @IsOptional()
  @IsEnum(withdrawal_status_enum)
  status?: withdrawal_status_enum;

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
