import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  ValidateNested,
  ValidateIf,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../common/decorators/trim.decorator';
import {
  size_enum,
  gender_enum,
  civil_status_enum,
  highest_education_enum,
  employment_status_enum,
  employment_type_enum,
  payment_method_enum,
  payment_reason_enum,
} from '../../generated/prisma/enums';

export class BeneficiaryDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MaxLength(50)
  middleName!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+63\d{10}$/)
  contactNumber!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  address!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  idNumber!: string;
}

/**
 * A trainee's details, the same on the enrollment form and the admin's edit form
 */
export class TraineeDetailsDto {
  // Personal Information
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  middleName!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth!: string; // YYYY-MM-DD

  @IsEnum(gender_enum)
  gender!: gender_enum;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+63\d{10}$/)
  contactNumber!: string; // e.g., +63 900 000 0000

  // Address Information
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  streetAddress!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  barangay!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipality!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province!: string;

  // Additional Information
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  placeOfBirth!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  citizenship?: string; // Defaults to "FILIPINO"

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  motherName!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fatherName!: string;

  @IsEnum(civil_status_enum)
  civilStatus!: civil_status_enum;

  @IsEnum(highest_education_enum)
  highestEducation!: highest_education_enum;

  @IsBoolean()
  pwd!: boolean;

  @IsEnum(employment_status_enum)
  employmentStatus!: employment_status_enum;

  @IsEnum(employment_type_enum)
  employmentType!: employment_type_enum;

  @ValidateNested()
  @Type(() => BeneficiaryDto)
  beneficiary!: BeneficiaryDto;
}

/**
 * DTO for creating or updating a trainee during enrollment
 */
export class TraineeInfoDto extends TraineeDetailsDto {
  @IsOptional()
  @IsUUID()
  id?: string; // UUID of existing trainee (if selecting existing)

  @IsBoolean()
  isExistingTrainee!: boolean; // Flag to indicate if this is an existing or new trainee
}

/**
 * DTO for document checklist items
 */
export class RequirementChecklistDto {
  @IsBoolean()
  bcNsoPsaCopy!: boolean;

  @IsBoolean()
  diplomaTor!: boolean;

  @IsBoolean()
  brgyClearance!: boolean;

  @IsBoolean()
  oneByOnePic!: boolean;

  @IsBoolean()
  twoByTwoPic!: boolean;

  @IsBoolean()
  passportSize!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class EnrollmentPaymentDto {
  @IsBoolean()
  processPayment!: boolean;

  @ValidateIf((payment) => payment.processPayment)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ValidateIf((payment) => payment.processPayment)
  @IsEnum(payment_method_enum)
  paymentMethod?: payment_method_enum;

  @IsOptional()
  @IsEnum(payment_reason_enum)
  reasonOfDues?: payment_reason_enum;

  @IsOptional()
  @IsString()
  remarks?: string;
}

/**
 * Main DTO for creating an enrollment
 */
export class CreateEnrollmentDto {
  // Trainee Information
  @ValidateNested()
  @Type(() => TraineeInfoDto)
  trainee!: TraineeInfoDto;

  // Batch Selection
  @IsUUID()
  batchId!: string;

  // Document Checklist
  @ValidateNested()
  @Type(() => RequirementChecklistDto)
  requirementChecklist!: RequirementChecklistDto;

  // Uniform & ID
  @IsEnum(size_enum)
  uniformSize!: size_enum;

  @IsBoolean()
  uniformGiven!: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;

  @ValidateNested()
  @Type(() => EnrollmentPaymentDto)
  payment!: EnrollmentPaymentDto;
}
