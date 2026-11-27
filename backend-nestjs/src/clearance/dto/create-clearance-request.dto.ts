import {
  ArrayNotEmpty,
  ArrayUnique,
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';
import { certificate_type_enum } from '../../generated/prisma/client';
import {
  MAX_OTHER_LENGTH,
  MAX_PURPOSE_LENGTH,
  REQUESTABLE_CERTIFICATES,
} from '../clearance.constants';

export class CreateClearanceRequestDto {
  @IsUUID()
  enrollment_id: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Choose at least one certificate' })
  @ArrayUnique()
  @IsIn(REQUESTABLE_CERTIFICATES, {
    each: true,
    message: 'Unknown certificate type',
  })
  certificates: certificate_type_enum[];

  /** Required only when "Other" is one of the certificates. */
  @ValidateIf(
    (dto: CreateClearanceRequestDto) =>
      Array.isArray(dto.certificates) &&
      dto.certificates.includes(certificate_type_enum.OTHER),
  )
  @Trim()
  @IsString({ message: 'Name the other certificate' })
  @IsNotEmpty({ message: 'Name the other certificate' })
  @MaxLength(MAX_OTHER_LENGTH)
  other_specify?: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Enter the purpose of the request' })
  @MaxLength(MAX_PURPOSE_LENGTH)
  purpose_of_request: string;

  /** The student's certification box on the form. */
  @Equals(true, { message: 'Tick the certification box to submit' })
  certified: boolean;
}
