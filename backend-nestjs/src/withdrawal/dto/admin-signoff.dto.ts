import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ADMIN_ACTIONS = ['APPROVE', 'REJECT'] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const ADMIN_REMARKS_MAX = 1000;

const blankToUndefined = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * The admin's final sign-off (decision D-09). The admin confirms that the
 * trainee surrendered their ID: an APPROVE needs `surrendered_id = true`
 * (checked by the service, which answers 400), a REJECT does not and saves the
 * value as sent. Remarks are optional for both actions. Any other field sent is
 * dropped by the whitelist.
 */
export class AdminSignoffDto {
  @IsIn(ADMIN_ACTIONS)
  action: AdminAction;

  @IsOptional()
  @IsBoolean()
  surrendered_id?: boolean;

  @Transform(blankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_REMARKS_MAX)
  remarks?: string;
}
