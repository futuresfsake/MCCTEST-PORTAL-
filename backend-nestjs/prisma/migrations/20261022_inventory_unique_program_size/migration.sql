-- DropIndex
DROP INDEX "uq_inventory_program_item_size";

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_program_size"
ON "inventory"("program_id", "sizes");