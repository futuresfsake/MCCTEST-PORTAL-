-- Append-only history of batch and program changes.
-- One row per change, written in the same transaction as the change.
CREATE TYPE "enrollment_transfer_type_enum" AS ENUM ('BATCH_CHANGE', 'PROGRAM_CHANGE');

CREATE TABLE "enrollment_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "enrollment_transfer_type_enum" NOT NULL,
    "trainee_id" UUID NOT NULL,
    "from_enrollment_id" UUID NOT NULL,
    "to_enrollment_id" UUID NOT NULL,
    "from_batch_id" UUID NOT NULL,
    "to_batch_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "performed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_transfers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_trainee_id_fkey"
FOREIGN KEY ("trainee_id") REFERENCES "trainee"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_from_enrollment_id_fkey"
FOREIGN KEY ("from_enrollment_id") REFERENCES "enrollments"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_to_enrollment_id_fkey"
FOREIGN KEY ("to_enrollment_id") REFERENCES "enrollments"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_from_batch_id_fkey"
FOREIGN KEY ("from_batch_id") REFERENCES "batch"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_to_batch_id_fkey"
FOREIGN KEY ("to_batch_id") REFERENCES "batch"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollment_transfers"
ADD CONSTRAINT "enrollment_transfers_performed_by_fkey"
FOREIGN KEY ("performed_by") REFERENCES "users"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Newest-first history per trainee.
CREATE INDEX "idx_enrollment_transfers_trainee"
ON "enrollment_transfers" ("trainee_id", "created_at" DESC, "id" DESC);

-- Walking back through earlier program changes to find a carried-over payment.
CREATE INDEX "idx_enrollment_transfers_to_enrollment"
ON "enrollment_transfers" ("to_enrollment_id");
