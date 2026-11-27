import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { clearance_request_status_enum } from '../../generated/prisma/client';

export class ClearanceQueryDto {
  @IsOptional()
  @IsEnum(clearance_request_status_enum)
  status?: clearance_request_status_enum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
