-- The trainer confirms the real start date of a batch, and every change of
-- the batch dates or status is kept in an append-only history.
ALTER TABLE "batch"
ADD COLUMN "start_date_confirmed_by" UUID,
ADD COLUMN "start_date_confirmed_at" TIMESTAMPTZ(6);

ALTER TABLE "batch"
ADD CONSTRAINT "batch_start_date_confirmed_by_fkey"
FOREIGN KEY ("start_date_confirmed_by") REFERENCES "users"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TYPE "batch_schedule_change_enum" AS ENUM (
    'START_DATE_SET',
    'START_DATE_CHANGED',
    'END_DATE_CHANGED',
    'STARTED',
    'CLOSED',
    'DATES_EDITED_BY_STAFF'
);

CREATE TABLE "batch_schedule_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_type" "batch_schedule_change_enum" NOT NULL,
    "old_start_date" DATE NOT NULL,
    "new_start_date" DATE NOT NULL,
    "old_end_date" DATE NOT NULL,
    "new_end_date" DATE NOT NULL,
    "old_status" "batch_status_enum" NOT NULL,
    "new_status" "batch_status_enum" NOT NULL,
    "reason" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_schedule_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "batch_schedule_history"
ADD CONSTRAINT "batch_schedule_history_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "batch"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "batch_schedule_history"
ADD CONSTRAINT "batch_schedule_history_changed_by_fkey"
FOREIGN KEY ("changed_by") REFERENCES "users"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Newest-first timeline per batch.
CREATE INDEX "idx_batch_schedule_history_batch"
ON "batch_schedule_history" ("batch_id", "changed_at" DESC, "id" DESC);
