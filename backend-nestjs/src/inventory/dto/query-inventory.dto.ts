import { Type } from 'class-transformer';
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
import { size_enum } from '../../generated/prisma/client';

export class QueryInventoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  size?: size_enum;

  @IsOptional()
  @IsIn(['in_stock', 'low', 'out'])
  stockLevel?: 'in_stock' | 'low' | 'out';

  @IsOptional()
  @IsIn(['program', 'item', 'size', 'quantity'])
  sortBy: 'program' | 'item' | 'size' | 'quantity' = 'program';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
