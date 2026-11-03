-- Give every program one inventory row per size at quantity 0, so every program
-- shows up in the inventory by default.
--
-- Only missing rows are added (ON CONFLICT DO NOTHING on the unique program +
-- size index), so existing rows, quantities and history are not changed. Each
-- new row gets an INITIAL history entry of 0, performed by the user who created
-- the program. New programs get the same rows from the application when they
-- are created.

WITH created AS (
    INSERT INTO "inventory" ("program_id", "item_name", "sizes", "quantity", "updated_by")
    SELECT p."id", 'Uniform Shirt', s.size, 0, p."created_by"
    FROM "programs" p
    CROSS JOIN unnest(enum_range(NULL::"size_enum")) AS s(size)
    ON CONFLICT ("program_id", "sizes") DO NOTHING
    RETURNING "id", "updated_by"
)
INSERT INTO "inventory_transactions" (
    "inventory_id",
    "type",
    "quantity_change",
    "quantity_after",
    "performed_by",
    "remarks"
)
SELECT
    "id",
    'INITIAL'::"inventory_transaction_type_enum",
    0,
    0,
    "updated_by",
    'Default stock (opening balance)'
FROM created;
