-- Удаляем этапы «недвижимость» и «проект» из типа StageType

DELETE FROM "object_stages" WHERE "stage_type"::text IN ('realty', 'project');

UPDATE "construction_objects"
SET "current_stage" = 'foundation'::"StageType"
WHERE "current_stage"::text IN ('realty', 'project');

CREATE TYPE "StageType_new" AS ENUM ('foundation', 'walls', 'roof', 'engineering', 'finish', 'furniture');

ALTER TABLE "object_stages" ALTER COLUMN "stage_type" TYPE "StageType_new" USING ("stage_type"::text::"StageType_new");

ALTER TABLE "construction_objects" ALTER COLUMN "current_stage" DROP DEFAULT;
ALTER TABLE "construction_objects" ALTER COLUMN "current_stage" TYPE "StageType_new" USING ("current_stage"::text::"StageType_new");
ALTER TABLE "construction_objects" ALTER COLUMN "current_stage" SET DEFAULT 'foundation'::"StageType_new";

DROP TYPE "StageType";
ALTER TYPE "StageType_new" RENAME TO "StageType";
