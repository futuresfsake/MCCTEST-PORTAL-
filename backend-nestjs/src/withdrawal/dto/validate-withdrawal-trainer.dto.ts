import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const TRAINER_ACTIONS = ['APPROVE', 'REJECT'] as const;
export type TrainerAction = (typeof TRAINER_ACTIONS)[number];

/** Blank text counts as "no remarks". */
const blankToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export class ValidateWithdrawalTrainerDto {
  @IsIn(TRAINER_ACTIONS)
  action: TrainerAction;

  /**
   * Optional when approving. Required when rejecting, so the trainee always
   * sees why (decision D-07).
   */
  @Transform(blankToUndefined)
  @ValidateIf(
    (dto: ValidateWithdrawalTrainerDto) =>
      dto.action === 'REJECT' || dto.remarks !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Remarks are required when rejecting a request' })
  @MaxLength(1000)
  remarks?: string;
}
