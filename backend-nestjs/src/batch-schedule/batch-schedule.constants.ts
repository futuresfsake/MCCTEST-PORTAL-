/** Every batch date or status change needs a reason of this length. */
export const SCHEDULE_REASON_MIN = 5;
export const SCHEDULE_REASON_MAX = 500;

export const CONFIRMED_BY_TRAINER_MESSAGE =
  'The trainer confirmed the start date. Ask the trainer to change it.';

export const ONLY_TRAINER_STARTS_OR_CLOSES_MESSAGE =
  'Only the trainer can start or close a batch.';

export const STALE_BATCH_MESSAGE =
  'This batch was changed by someone else. Reload to see the latest dates.';
