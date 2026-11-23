ALTER TABLE "training_session"
  ADD COLUMN "hours" DECIMAL(5,2) NOT NULL,
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_by" UUID;

ALTER TABLE "training_session"
  ADD CONSTRAINT "training_session_hours_check" CHECK ("hours" > 0 AND "hours" <= 24);

ALTER TABLE "training_session"
  ADD CONSTRAINT "training_session_batch_id_session_date_key"
  UNIQUE ("batch_id", "session_date");

ALTER TABLE "training_session"
  ADD CONSTRAINT "training_session_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "attendance"
  ADD COLUMN "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_by" UUID;

ALTER TABLE "attendance"
  ADD CONSTRAINT "attendance_session_id_enrollment_id_key"
  UNIQUE ("session_id", "enrollment_id");

ALTER TABLE "attendance"
  ADD CONSTRAINT "attendance_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE "attendance_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID,
  "attendance_id" UUID,
  "enrollment_id" UUID,
  "event_type" VARCHAR(30) NOT NULL,
  "old_status" "attendance_status_enum",
  "new_status" "attendance_status_enum",
  "old_remarks" TEXT,
  "new_remarks" TEXT,
  "old_hours" DECIMAL(5,2),
  "new_hours" DECIMAL(5,2),
  "changed_by" UUID NOT NULL,
  "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT,
  CONSTRAINT "attendance_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "attendance_history"
  ADD CONSTRAINT "attendance_history_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "training_session"("session_id") ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT "attendance_history_changed_by_fkey"
  FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_attendance_history_session"
  ON "attendance_history" ("session_id", "changed_at" DESC);

CREATE INDEX "idx_attendance_history_enrollment"
  ON "attendance_history" ("enrollment_id", "changed_at" DESC);
