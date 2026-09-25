-- AlterTable
ALTER TABLE "programs" DROP COLUMN "end_time",
DROP COLUMN "id_card_prefix",
DROP COLUMN "schedule",
DROP COLUMN "start_time",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "program_code" VARCHAR(20) NOT NULL;

-- CreateTable
CREATE TABLE "program_schedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "program_id" UUID NOT NULL,
    "schedule_name" VARCHAR(50) NOT NULL,
    "days" "day_enum"[],
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,

    CONSTRAINT "program_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_program_schedule_program" ON "program_schedule"("program_id");

-- AddForeignKey
ALTER TABLE "program_schedule" ADD CONSTRAINT "program_schedule_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

