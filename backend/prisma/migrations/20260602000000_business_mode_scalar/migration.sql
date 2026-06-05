-- Migrate Business.mode from Mode[] (array) to a single scalar Mode value.
--
-- Conversion rule (applied to existing data BEFORE the type change, via USING):
--   new mode = first non-PRODUCTS element of the current array;
--   if the array is empty/NULL or contains only PRODUCTS -> 'SERVICES'.
-- This preserves every business's real mode and drops the dormant PRODUCTS value.

-- (No-op if absent) clear any column default before changing the type.
ALTER TABLE "Business" ALTER COLUMN "mode" DROP DEFAULT;

-- Array -> scalar conversion, preserving data. array_remove() keeps element
-- order, so [1] is the first non-PRODUCTS value; empty/NULL -> SERVICES.
-- (Postgres forbids subqueries in a USING transform, hence array_remove.)
ALTER TABLE "Business"
  ALTER COLUMN "mode" TYPE "Mode"
  USING COALESCE(
    (array_remove("mode", 'PRODUCTS'::"Mode"))[1],
    'SERVICES'::"Mode"
  );

-- Match the new schema: required, defaulting to SERVICES.
ALTER TABLE "Business" ALTER COLUMN "mode" SET DEFAULT 'SERVICES';
ALTER TABLE "Business" ALTER COLUMN "mode" SET NOT NULL;
