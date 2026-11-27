import {
  certificate_type_enum,
  clearance_request_status_enum,
  enrollment_status_enum,
} from '../generated/prisma/client';

/** A request in any of these states is still "open" for its enrollment. */
export const OPEN_CLEARANCE_STATUSES: clearance_request_status_enum[] = [
  clearance_request_status_enum.PENDING_VALIDATION,
  clearance_request_status_enum.TRAINER_VALIDATED,
  clearance_request_status_enum.REGISTRAR_VALIDATED,
  clearance_request_status_enum.PROCESSED,
];

/** Enrollment states a trainee may ask a clearance for. */
export const CLEARANCE_ENROLLMENT_STATUSES: enrollment_status_enum[] = [
  enrollment_status_enum.ENROLLED,
  enrollment_status_enum.COMPLETED,
];

/** The certificates on the form, in the order they are printed. */
export const REQUESTABLE_CERTIFICATES = [
  certificate_type_enum.COC,
  certificate_type_enum.COT,
  certificate_type_enum.OTHER,
] as const;

export const MAX_PURPOSE_LENGTH = 500;
export const MAX_OTHER_LENGTH = 100;

/** Printed on the paper form: "Control No.: MCCTEST00____". */
export const CONTROL_NUMBER_PREFIX = 'MCCTEST00';
