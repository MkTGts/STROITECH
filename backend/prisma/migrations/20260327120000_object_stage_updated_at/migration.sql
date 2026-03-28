-- AlterTable
ALTER TABLE "object_stages" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "object_stages_object_id_idx" ON "object_stages"("object_id");
