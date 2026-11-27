-- MP-60: Clearance and certificate request pipeline (additive, no existing row or column is changed).

-- CreateEnum
CREATE TYPE "clearance_request_status_enum" AS ENUM ('PENDING_VALIDATION', 'TRAINER_VALIDATED', 'REGISTRAR_VALIDATED', 'PROCESSED', 'RELEASED', 'REJECTED', 'CANCELLED');

-- AlterTable: the status column is added without a default first, so rows that already exist stay NULL.
ALTER TABLE "request_form" ADD COLUMN     "certified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "certified_at" TIMESTAMPTZ(6),
ADD COLUMN     "control_number" VARCHAR(30),
ADD COLUMN     "pipeline_status" "clearance_request_status_enum";

ALTER TABLE "request_form" ALTER COLUMN "pipeline_status" SET DEFAULT 'PENDING_VALIDATION';

-- AlterTable
ALTER TABLE "clearance" ADD COLUMN     "documents_submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "encoder_processed_at" TIMESTAMPTZ(6),
ADD COLUMN     "encoder_processed_by" UUID,
ADD COLUMN     "finances_cleared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrar_remarks" TEXT,
ADD COLUMN     "registrar_validated_at" TIMESTAMPTZ(6),
ADD COLUMN     "registrar_validated_by" UUID,
ADD COLUMN     "trainer_assessments_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainer_hours_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainer_portfolio_submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainer_remarks" TEXT,
ADD COLUMN     "trainer_tools_returned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainer_validated_at" TIMESTAMPTZ(6),
ADD COLUMN     "trainer_validated_by" UUID;

-- CreateTable
CREATE TABLE "clearance_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_form_id" UUID NOT NULL,
    "old_status" "clearance_request_status_enum",
    "new_status" "clearance_request_status_enum" NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "clearance_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_clearance_history_request_changed" ON "clearance_status_history"("request_form_id", "changed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "request_form_control_number_key" ON "request_form"("control_number");

-- CreateIndex
CREATE INDEX "idx_request_form_pipeline_status" ON "request_form"("pipeline_status");

-- AddForeignKey
ALTER TABLE "clearance" ADD CONSTRAINT "clearance_trainer_validated_by_fkey" FOREIGN KEY ("trainer_validated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clearance" ADD CONSTRAINT "clearance_registrar_validated_by_fkey" FOREIGN KEY ("registrar_validated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clearance" ADD CONSTRAINT "clearance_encoder_processed_by_fkey" FOREIGN KEY ("encoder_processed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clearance_status_history" ADD CONSTRAINT "clearance_status_history_request_form_id_fkey" FOREIGN KEY ("request_form_id") REFERENCES "request_form"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "clearance_status_history" ADD CONSTRAINT "clearance_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Running number of the control numbers (MCCTEST001, MCCTEST002, ...). One counter for all programs.
CREATE SEQUENCE "clearance_control_number_seq";

-- The certificate types of the form. Added only where they are missing.
INSERT INTO "certificate_type" ("type", "description") VALUES
  ('COC', 'Certificate of Completion'),
  ('COT', 'Certificate of Training'),
  ('OTHER', 'Other')
ON CONFLICT ("type") DO NOTHING;
