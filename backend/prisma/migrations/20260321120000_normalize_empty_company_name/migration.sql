-- company_name уже nullable; пустые строки приводим к NULL для единообразия с «не указано»
UPDATE "users"
SET "company_name" = NULL
WHERE "company_name" IS NOT NULL AND BTRIM("company_name") = '';
