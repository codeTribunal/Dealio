-- Optional owner email + newsletter/marketing consent (separate from GDPR
-- enrollment consents). Additive, nullable/defaulted — safe.
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "newsletterConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "newsletterConsentAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailPromptDismissedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailPromptDismissCount" INTEGER NOT NULL DEFAULT 0;
