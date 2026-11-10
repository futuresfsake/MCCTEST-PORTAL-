import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { size_enum } from '../../generated/prisma/enums';
import { EnrollmentPaymentDto } from './create-enrollment.dto';

/** Moves an enrollment to another batch of the same program. */
export class ChangeBatchDto {
  @IsUUID()
  batchId!: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'A reason is required.' })
  @MaxLength(500)
  reason!: string;
}

/** Moves a trainee to a batch of a different program. */
export class ChangeProgramDto extends ChangeBatchDto {
  /** Left out, or processPayment false: the payment carries over with no new OR. */
  @IsOptional()
  @ValidateNested()
  @Type(() => EnrollmentPaymentDto)
  payment?: EnrollmentPaymentDto;

  /** True deducts one uniform of `uniformSize` from the new program's stock. */
  @IsOptional()
  @IsBoolean()
  uniformGiven?: boolean;

  /** Required when the uniform is given. Otherwise the current size is kept. */
  @ValidateIf(
    (dto: ChangeProgramDto) =>
      dto.uniformGiven === true || dto.uniformSize !== undefined,
  )
  @IsEnum(size_enum)
  uniformSize?: size_enum;
}
