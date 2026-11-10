/**
 * Trainee Information: trainee records shared by the staff modules, plus the
 * admin's editing and change history. Shapes match the backend responses.
 */

export type TraineeInformationRole = 'admin' | 'registrar' | 'trainer' | 'encoder';

export type EnrollmentStatus = 'PENDING' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'DROPPED';
export type BatchStatus = 'OPEN' | 'ONGOING' | 'CLOSED' | 'CANCELLED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = ['PENDING', 'ENROLLED', 'WITHDRAWN', 'COMPLETED', 'DROPPED'];
export const BATCH_STATUSES: readonly BatchStatus[] = ['OPEN', 'ONGOING', 'CLOSED', 'CANCELLED'];
export const GENDERS: readonly Gender[] = ['MALE', 'FEMALE', 'OTHER'];

export const SORT_FIELDS = ['name', 'enrolledAt', 'idCard'] as const;
export type TraineeSortField = (typeof SORT_FIELDS)[number];
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PAGE_SIZES = [10, 20, 50] as const;
export const PROGRAM_TYPES = ['ACCREDITED', 'NON_ACCREDITED'] as const;
export const INSURANCE_FILTERS = ['ACTIVE', 'NONE'] as const;
export const REQUIREMENT_FILTERS = ['COMPLETE', 'INCOMPLETE'] as const;

/** Every filter the list supports; the keys are also the URL and API query names. */
export interface TraineeFilters {
  search: string;
  programId: string;
  batchId: string;
  enrollmentStatus: '' | EnrollmentStatus;
  batchStatus: '' | BatchStatus;
  dateFrom: string;
  dateTo: string;
  programType: '' | (typeof PROGRAM_TYPES)[number];
  gender: '' | Gender;
  insurance: '' | (typeof INSURANCE_FILTERS)[number];
  requirements: '' | (typeof REQUIREMENT_FILTERS)[number];
}

export type TraineeFilterKey = keyof TraineeFilters;

export interface TraineeListQuery extends TraineeFilters {
  page: number;
  limit: number;
  sortBy: TraineeSortField;
  sortOrder: SortOrder;
}

export interface TraineeListEnrollment {
  id: string;
  programName: string;
  batchName: string;
  status: EnrollmentStatus;
  idCardNumber: string | null;
  /** ISO timestamp */
  enrolledAt: string;
}

export interface TraineeListRow {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  username: string | null;
  email: string | null;
  contactNumber: string;
  enrollment: TraineeListEnrollment | null;
  otherEnrollmentCount: number;
}

export interface TraineeListResponse {
  data: TraineeListRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TraineeFilterOptions {
  programs: { id: string; name: string; isAccredited: boolean }[];
  batches: { id: string; name: string; programId: string; status: BatchStatus }[];
  enrollmentStatuses: EnrollmentStatus[];
  batchStatuses: BatchStatus[];
  genders: Gender[];
}

export interface TraineeProfileEnrollment {
  id: string;
  status: EnrollmentStatus;
  idCardNumber: string | null;
  uniformSize: string | null;
  /** ISO timestamp */
  enrolledAt: string;
  orNumber: string | null;
  requirementsSubmitted: number;
  requirementsTotal: number;
  /** requirement_checklist.remarks for this enrollment */
  requirementsRemarks: string | null;
  batch: {
    id: string;
    name: string;
    status: BatchStatus;
    /** YYYY-MM-DD */
    startDate: string;
    /** YYYY-MM-DD */
    endDate: string;
    trainerName: string | null;
  };
  program: {
    id: string;
    name: string;
    isAccredited: boolean;
    schedules: { name: string; days: string[]; startTime: string; endTime: string }[];
  };
}

export interface TraineeProfile {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  username: string | null;
  email: string | null;
  contactNumber: string;
  gender: Gender;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  placeOfBirth: string;
  citizenship: string;
  civilStatus: string;
  pwd: boolean;
  address: { street: string; barangay: string; municipality: string; district: string; province: string };
  family: { motherName: string; fatherName: string };
  education: { highestEducation: string };
  employment: { status: string; type: string };
  beneficiary: {
    firstName: string;
    middleName: string;
    lastName: string;
    relationship: string;
    contactNumber: string;
    address: string;
    idNumber: string;
  } | null;
  insurance: { id: string; effectiveDate: string; expiryDate: string; orNumber: string; isActive: boolean }[];
  enrollments: TraineeProfileEnrollment[];
}

export const CIVIL_STATUSES = ['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'DIVORCED'] as const;
export const HIGHEST_EDUCATIONS = ['ELEMENTARY', 'HIGH_SCHOOL', 'VOCATIONAL', 'COLLEGE', 'POST_GRADUATE', 'NA'] as const;
export const EMPLOYMENT_STATUSES = ['EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED', 'STUDENT', 'NA'] as const;
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTUAL', 'SEASONAL', 'NA'] as const;
export const UNIFORM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
export const PAYMENT_METHODS = ['CASH', 'GCASH', 'BANK_TRANSFER', 'CHECK'] as const;

export type UniformSize = (typeof UNIFORM_SIZES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Body of the admin's Edit Trainee form. The username and password are not in it. */
export interface UpdateTraineePayload {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  gender: string;
  /** YYYY-MM-DD */
  dateOfBirth: string;
  placeOfBirth: string;
  citizenship: string;
  civilStatus: string;
  pwd: boolean;
  streetAddress: string;
  barangay: string;
  municipality: string;
  district: string;
  province: string;
  motherName: string;
  fatherName: string;
  highestEducation: string;
  employmentStatus: string;
  employmentType: string;
  beneficiary: {
    firstName: string;
    middleName: string;
    lastName: string;
    relationship: string;
    contactNumber: string;
    address: string;
    idNumber: string;
  };
}

export interface ChangeBatchOption {
  id: string;
  name: string;
  programId: string;
  programName: string;
  isAccredited: boolean;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  remainingSlots: number;
  schedules: { name: string; days: string[]; startTime: string; endTime: string }[];
}

export interface ChangeOptions {
  enrollment: {
    id: string;
    status: EnrollmentStatus;
    uniformSize: UniformSize | null;
    batchName: string;
    programName: string;
  };
  sameProgramBatches: ChangeBatchOption[];
  otherProgramBatches: ChangeBatchOption[];
}

export interface ChangeBatchPayload {
  batchId: string;
  reason: string;
}

export interface ChangeProgramPayload extends ChangeBatchPayload {
  /** Left out: the payment carries over and no new OR is made. */
  payment?: { processPayment: true; amount: number; paymentMethod: PaymentMethod };
  uniformGiven: boolean;
  uniformSize?: UniformSize;
}

export type ChangeHistoryType = 'BATCH_CHANGE' | 'PROGRAM_CHANGE';

export interface ChangeHistoryPlace {
  enrollmentId: string;
  batchId: string;
  batchName: string;
  programName: string;
}

export interface ChangeHistoryEntry {
  id: string;
  type: ChangeHistoryType;
  reason: string;
  /** ISO timestamp */
  createdAt: string;
  performedBy: string;
  from: ChangeHistoryPlace;
  to: ChangeHistoryPlace;
}

/** A saved change. A program change also says what the new enrollment received. */
export interface ChangeResult extends ChangeHistoryEntry {
  idCardNumber?: string;
  orNumber?: string | null;
}
