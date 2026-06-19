-- Global admin search: fast case-insensitive substring (ILIKE %…%) matching
-- via trigram indexes. Prisma's schema cannot express GIN/trgm indexes, so
-- they live in this raw-SQL migration.

-- Trigram matching extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on the searchable columns.
CREATE INDEX IF NOT EXISTS "idx_business_name_trgm"
  ON "Business" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_customer_name_trgm"
  ON "Customer" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_customer_phone_trgm"
  ON "Customer" USING gin ("phone" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "idx_customer_telegram_trgm"
  ON "Customer" USING gin ("telegramUsername" gin_trgm_ops);

-- Owner-phone substring search: the existing User.phone @unique b-tree cannot
-- serve %…%, so add a trigram index too.
CREATE INDEX IF NOT EXISTS "idx_user_phone_trgm"
  ON "User" USING gin ("phone" gin_trgm_ops);
