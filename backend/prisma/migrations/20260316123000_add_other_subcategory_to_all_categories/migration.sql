-- Add "Прочее" subcategory for each root category (parent_id IS NULL)
INSERT INTO "categories" ("name", "parent_id", "type")
SELECT 'Прочее', p."id", p."type"
FROM "categories" p
WHERE p."parent_id" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "categories" c
    WHERE c."parent_id" = p."id"
      AND c."name" = 'Прочее'
  );

