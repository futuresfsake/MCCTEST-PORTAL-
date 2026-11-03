import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID, Max, Min } from 'class-validator';
import { size_enum } from '../../generated/prisma/client';

export class CreateInventoryDto {
  @IsUUID()
  program_id!: string;

  @IsEnum(size_enum)
  sizes!: size_enum;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  quantity!: number;
}
