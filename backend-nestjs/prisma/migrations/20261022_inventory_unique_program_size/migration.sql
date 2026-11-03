-- DropIndex
DROP INDEX "idx_enrollments_enrolled_at";

-- DropIndex
DROP INDEX "idx_insurance_coverage_trainee";

-- DropIndex
DROP INDEX "uq_inventory_program_item_size";

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_program_size" ON "inventory"("program_id", "sizes");
