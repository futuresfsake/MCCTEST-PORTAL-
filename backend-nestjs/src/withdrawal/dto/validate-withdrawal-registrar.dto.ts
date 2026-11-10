import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const REGISTRAR_ACTIONS = ['APPROVE', 'REJECT'] as const;
export type RegistrarAction = (typeof REGISTRAR_ACTIONS)[number];

export const REGISTRAR_REMARKS_MAX = 1000;

const blankToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * The registrar's decision. The two checklist items
 * are manual ticks and always sent, so a rejection records what was missing.
 * The ID is not a registrar item: the trainee hands it in after the request is
 * accepted, so the admin confirms it at sign-off. Any `surrendered_id` sent here
 * is dropped by the whitelist.
 * Remarks are required to reject and optional to approve.
 */
export class ValidateWithdrawalRegistrarDto {
  @IsIn(REGISTRAR_ACTIONS)
  action: RegistrarAction;

  @IsBoolean()
  finances_cleared: boolean;

  @IsBoolean()
  documents_submitted: boolean;

  @Transform(blankToUndefined)
  @ValidateIf(
    (dto: ValidateWithdrawalRegistrarDto) =>
      dto.action === 'REJECT' || dto.remarks !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Remarks are required when rejecting a request' })
  @MaxLength(REGISTRAR_REMARKS_MAX)
  remarks?: string;
}
