-- MP-45: Withdrawal approval pipeline (additive, no existing column is dropped or changed).

-- CreateEnum
CREATE TYPE "withdrawal_status_enum" AS ENUM ('PENDING_VALIDATION', 'TRAINER_VALIDATED', 'PENDING_ADMIN_SIGNOFF', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "withdrawal_request" ADD COLUMN     "admin_remarks" TEXT,
ADD COLUMN     "admin_signed_off_at" TIMESTAMPTZ(6),
ADD COLUMN     "admin_signed_off_by" UUID,
ADD COLUMN     "documents_submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finances_cleared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrar_remarks" TEXT,
ADD COLUMN     "registrar_validated_at" TIMESTAMPTZ(6),
ADD COLUMN     "registrar_validated_by" UUID,
ADD COLUMN     "trainer_remarks" TEXT,
ADD COLUMN     "trainer_validated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trainer_validated_at" TIMESTAMPTZ(6),
ADD COLUMN     "trainer_validated_by" UUID,
ADD COLUMN     "withdrawal_status" "withdrawal_status_enum" NOT NULL DEFAULT 'PENDING_VALIDATION';

-- Backfill: carry the legacy request_status over so old rows do not all read as pending.
UPDATE "withdrawal_request" SET "withdrawal_status" = 'APPROVED'  WHERE "request_status" = 'APPROVED';
UPDATE "withdrawal_request" SET "withdrawal_status" = 'REJECTED'  WHERE "request_status" = 'REJECTED';
UPDATE "withdrawal_request" SET "withdrawal_status" = 'CANCELLED' WHERE "request_status" = 'CANCELLED';

-- CreateTable
CREATE TABLE "withdrawal_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "withdrawal_request_id" UUID NOT NULL,
    "old_status" "withdrawal_status_enum",
    "new_status" "withdrawal_status_enum" NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "withdrawal_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_withdrawal_history_request_changed" ON "withdrawal_status_history"("withdrawal_request_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_withdrawal_status" ON "withdrawal_request"("withdrawal_status");

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_registrar_validated_by_fkey" FOREIGN KEY ("registrar_validated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_trainer_validated_by_fkey" FOREIGN KEY ("trainer_validated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withdrawal_request" ADD CONSTRAINT "withdrawal_request_admin_signed_off_by_fkey" FOREIGN KEY ("admin_signed_off_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withdrawal_status_history" ADD CONSTRAINT "withdrawal_status_history_withdrawal_request_id_fkey" FOREIGN KEY ("withdrawal_request_id") REFERENCES "withdrawal_request"("withdrawal_request_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "withdrawal_status_history" ADD CONSTRAINT "withdrawal_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
