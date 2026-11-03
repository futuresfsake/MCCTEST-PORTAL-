import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { inventory_transaction_type_enum } from '../../generated/prisma/client';

export class QueryInventoryHistoryDto {
  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsIn(Object.values(inventory_transaction_type_enum))
  type?: inventory_transaction_type_enum;

  /** Start of the range, inclusive (ISO 8601 date-time). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** End of the range, exclusive (ISO 8601 date-time). */
  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}
