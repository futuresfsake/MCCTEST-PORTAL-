/**
 * Trainee Information (MP-24): read-only trainee records shared by the
 * Admin and Registrar modules. Shapes match the backend responses.
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
