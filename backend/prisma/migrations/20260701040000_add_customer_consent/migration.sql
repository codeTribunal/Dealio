-- First-contact data-subject consent (ZRU-547) on Customer: captured by the bot
-- before any personal data is stored. Additive and nullable — safe.
ALTER TABLE "Customer" ADD COLUMN "consentedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "consentVersion" TEXT;
