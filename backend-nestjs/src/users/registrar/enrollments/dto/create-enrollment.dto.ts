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
} from '../../../../generated/prisma/enums';

/**
 * DTO for creating or updating a trainee during enrollment
 */
export class TraineeInfoDto {
  @IsOptional()
  @IsUUID()
  id?: string; // UUID of existing trainee (if selecting existing)

  // Personal Information
  @IsString()
  firstName!: string;

  @IsString()
  middleName!: string;

  @IsString()
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string; // YYYY-MM-DD

  @IsEnum(gender_enum)
  gender!: gender_enum;

  @IsString()
  contactNumber!: string; // e.g., +63 900 000 0000

  // Address Information
  @IsString()
  streetAddress!: string;

  @IsString()
  barangay!: string;

  @IsString()
  municipality!: string;

  @IsString()
  district!: string;

  @IsString()
  province!: string;

  // Additional Information
  @IsString()
  placeOfBirth!: string;

  @IsOptional()
  @IsString()
  citizenship?: string; // Defaults to "FILIPINO"

  @IsString()
  motherName!: string;

  @IsString()
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
