/**
 * Type definitions for enrollment-related data
 */

export interface TraineeData {
  id?: string; // UUID if existing trainee
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  contactNumber: string;
  streetAddress: string;
  barangay: string;
  municipality: string;
  district: string;
  province: string;
  placeOfBirth: string;
  citizenship?: string;
  motherName: string;
  fatherName: string;
  civilStatus: '' | 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'SEPARATED' | 'DIVORCED';
  highestEducation: '' | 'ELEMENTARY' | 'HIGH_SCHOOL' | 'VOCATIONAL' | 'COLLEGE' | 'POST_GRADUATE' | 'NA' | 'OTHER';
  highestEducationOther?: string;
  pwd: boolean;
  employmentStatus: '' | 'EMPLOYED' | 'UNEMPLOYED' | 'SELF_EMPLOYED' | 'STUDENT' | 'NA' | 'OTHER';
  employmentStatusOther?: string;
  employmentType: '' | 'FULL_TIME' | 'PART_TIME' | 'CASUAL' | 'CONTRACTUAL' | 'SEASONAL' | 'NA' | 'OTHER';
  employmentTypeOther?: string;
  isExistingTrainee: boolean;
  hasActiveInsurance?: boolean;
}

export interface EnrollmentPaymentData {
  processPayment: boolean;
  amount: string;
  paymentMethod: '' | 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CHECK';
  reasonOfDues: '' | 'ENROLLMENT' | 'PROCESSING_FEE' | 'UNIFORM_ID_FEE' | 'ASSESSMENT_DEPOSIT' | 'EXTERNAL_FEES';
  remarks: string;
}

export interface RequirementChecklistData {
  bcNsoPsaCopy: boolean;
  diplomaTor: boolean;
  brgyClearance: boolean;
  oneByOnePic: boolean;
  twoByTwoPic: boolean;
  passportSize: boolean;
  remarks?: string;
}

export interface BatchInfo {
  id: string;
  batchName: string;
  programId: string;
  programName: string;
  startDate: string;
  endDate: string;
  capacity: number;
  remainingCapacity: number;
  batchStatus: 'OPEN' | 'ONGOING' | 'CLOSED' | 'CANCELLED';
}

export interface EnrollmentFormData {
  trainee: TraineeData;
  batchId: string;
  requirementChecklist: RequirementChecklistData;
  uniformSize: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  uniformGiven: boolean;
  remarks?: string;
  payment: EnrollmentPaymentData;
}

export interface SearchedTrainee {
  id: string;
  users?: {
    first_name: string;
    last_name: string;
    middle_name: string;
  };
  contact_number: string;
  date_of_birth: string;
  gender: string;
}

export interface Program {
  id: string;
  name: string;
  id_card_prefix: string;
  control_number_prefix: string;
}

export interface EnrollmentRecord {
  id: string;
  enrollmentStatus: 'PENDING' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'DROPPED';
  uniformSize: string;
  idCardNumber: string;
  enrolledAt: string;
  remarks?: string;
  trainee: {
    id: string;
    users?: {
      first_name: string;
      last_name: string;
      middle_name: string;
    };
    contact_number: string;
  };
  batch: {
    id: string;
    batch_name: string;
    start_date: string;
    end_date: string;
    programs: {
      id: string;
      name: string;
    };
  };
  official_receipts: Array<{
    or_number: string;
  }>;
}
