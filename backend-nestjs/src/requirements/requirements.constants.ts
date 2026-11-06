/** The 7 checklist items. Keys are the requirement_checklist column names. */
export const REQUIREMENT_DOCUMENTS = [
  { key: 'bc_nso_psa_copy', label: 'PSA Birth Certificate' },
  { key: 'diploma_tor', label: 'Diploma / TOR' },
  { key: 'brgy_clearance', label: 'Barangay Clearance' },
  { key: 'one_by_one_pic', label: '1x1 Picture' },
  { key: 'two_by_two_pic', label: '2x2 Picture' },
  { key: 'passport_size', label: 'Passport Size Picture' },
  { key: 'commitment_fee', label: 'Commitment Fee' },
] as const;

export type RequirementDocumentKey =
  (typeof REQUIREMENT_DOCUMENTS)[number]['key'];

export const REQUIREMENT_DOCUMENT_KEYS: RequirementDocumentKey[] =
  REQUIREMENT_DOCUMENTS.map((d) => d.key);

/**
 * The commitment fee is a payment. It is shown in the checklist but changed
 * through Payments, so the checklist cannot edit it.
 */
export const READ_ONLY_DOCUMENT: RequirementDocumentKey = 'commitment_fee';

export const EDITABLE_DOCUMENT_KEYS: RequirementDocumentKey[] =
  REQUIREMENT_DOCUMENT_KEYS.filter((k) => k !== READ_ONLY_DOCUMENT);

export const REQUIREMENT_TOTAL = REQUIREMENT_DOCUMENTS.length;

/** Single place for the bulk cap (AC 14a). */
export const BULK_MAX_ROWS = 100;
export const BULK_MAX_ROWS_MESSAGE = `Maximum ${BULK_MAX_ROWS} rows per request`;

export const HISTORY_PAGE_SIZE = 20;

export const STALE_CHECKLIST_MESSAGE =
  'This checklist was updated by someone else. Reload to see the latest.';
