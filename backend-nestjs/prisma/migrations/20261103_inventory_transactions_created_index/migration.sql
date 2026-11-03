-- Program-level stock log: newest first across every inventory row, with an
-- optional date range. The per-item index (inventory_id, created_at, id)
-- cannot serve a query that is not scoped to one item.
CREATE INDEX "idx_inventory_transactions_created"
ON "inventory_transactions" ("created_at" DESC, "id" DESC);
