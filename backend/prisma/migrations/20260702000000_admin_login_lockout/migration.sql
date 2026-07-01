-- Admin login lockout (per-account brute-force defense).
-- Additive, non-destructive: adds two nullable/defaulted columns to AdminUser.
ALTER TABLE "AdminUser" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN "lockedUntil" TIMESTAMP(3);
