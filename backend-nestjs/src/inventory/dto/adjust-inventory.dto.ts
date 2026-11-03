import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class AdjustInventoryDto {
  // Positive adds stock; negative removes stock.
  @Type(() => Number)
  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  quantity_change: number;

  @IsString()
  @MaxLength(1000)
  reason: string;
}
