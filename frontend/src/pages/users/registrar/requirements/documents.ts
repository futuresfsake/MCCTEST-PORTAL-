import type { DocumentKey } from '../../../../api/requirements.api';

export const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  bc_nso_psa_copy: 'PSA Birth Certificate',
  diploma_tor: 'Diploma / TOR',
  brgy_clearance: 'Barangay Clearance',
  one_by_one_pic: '1x1 Picture',
  two_by_two_pic: '2x2 Picture',
  passport_size: 'Passport Size Picture',
  commitment_fee: 'Commitment Fee',
};

export const DOCUMENT_KEYS = Object.keys(DOCUMENT_LABELS) as DocumentKey[];
