import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RestockInventoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
