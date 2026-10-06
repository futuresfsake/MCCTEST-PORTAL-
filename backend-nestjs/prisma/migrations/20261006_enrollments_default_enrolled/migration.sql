-- Existing enrollment records should follow the center's policy that accepted
-- enrollment records are enrolled immediately.
UPDATE "public"."enrollments"
SET "enrollment_status" = 'ENROLLED'
WHERE "enrollment_status" = 'PENDING';

ALTER TABLE "public"."enrollments"
ALTER COLUMN "enrollment_status" SET DEFAULT 'ENROLLED';
