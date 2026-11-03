-- Restore the two MP-24 (trainee information) indexes.
--
-- 20261022_inventory_unique_program_size was generated from a schema that did
-- not list these indexes, so it dropped them, and it has already been applied to
-- the shared database. Applied migrations must not be edited, so this migration
-- recreates them. IF NOT EXISTS keeps it safe on a database that still has them.

-- Enrolled-date sorting and date range filtering on the trainee list.
CREATE INDEX IF NOT EXISTS "idx_enrollments_enrolled_at"
ON "enrollments" ("enrolled_at");

-- Active insurance lookups per trainee (the foreign key has no index).
CREATE INDEX IF NOT EXISTS "idx_insurance_coverage_trainee"
ON "insurance_coverage" ("trainee_id");
