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
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MaxLength(50)
  middleName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+63\d{10}$/)
  contactNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  idNumber!: string;
}

/**
 * DTO for creating or updating a trainee during enrollment
 */
export class TraineeInfoDto {
  @IsOptional()
  @IsUUID()
  id?: string; // UUID of existing trainee (if selecting existing)

  // Personal Information
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  middleName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth!: string; // YYYY-MM-DD

  @IsEnum(gender_enum)
  gender!: gender_enum;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+63\d{10}$/)
  contactNumber!: string; // e.g., +63 900 000 0000

  // Address Information
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  barangay!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipality!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  district!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  province!: string;

  // Additional Information
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  placeOfBirth!: string;

  @IsOptional()
  @IsString()
  citizenship?: string; // Defaults to "FILIPINO"

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  motherName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
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

  @IsBoolean()
  isExistingTrainee!: boolean; // Flag to indicate if this is an existing or new trainee

  @ValidateNested()
  @Type(() => BeneficiaryDto)
  beneficiary!: BeneficiaryDto;
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
