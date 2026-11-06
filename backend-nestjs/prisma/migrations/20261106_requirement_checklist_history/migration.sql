-- MP-43: append-only history of requirement checklist changes.
-- One row per document that changed on a save (single or bulk).
CREATE TABLE "requirement_checklist_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requirement_checklist_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "document" VARCHAR(30) NOT NULL,
    "old_value" BOOLEAN NOT NULL,
    "new_value" BOOLEAN NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "requirement_checklist_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "requirement_checklist_history"
ADD CONSTRAINT "requirement_checklist_history_requirement_checklist_id_fkey"
FOREIGN KEY ("requirement_checklist_id") REFERENCES "requirement_checklist"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "requirement_checklist_history"
ADD CONSTRAINT "requirement_checklist_history_enrollment_id_fkey"
FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "requirement_checklist_history"
ADD CONSTRAINT "requirement_checklist_history_changed_by_fkey"
FOREIGN KEY ("changed_by") REFERENCES "users"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Newest-first, cursor-paginated history per checklist.
CREATE INDEX "idx_requirement_history_checklist"
ON "requirement_checklist_history" ("requirement_checklist_id", "changed_at" DESC, "id" DESC);
