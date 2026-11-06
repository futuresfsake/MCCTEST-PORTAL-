import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { TraineeDetailsDto } from './create-enrollment.dto';

/**
 * The admin's Edit Trainee form: the same fields and rules as the enrollment
 * form, plus the email. The username and password are not here, and the
 * validation pipe strips any field not listed, so they cannot be changed.
 */
export class UpdateTraineeDto extends TraineeDetailsDto {
  /** Left out: unchanged. Blank or null: the email is cleared. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  )
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(255)
  email?: string | null;
}
