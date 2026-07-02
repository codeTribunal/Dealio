-- Owner self-serve account deletion: 30-day recoverable window then hard purge.
-- Additive + nullable/defaulted, so it never blocks existing businesses.
-- deletionState reuses the existing suspension enforcement (requesting deletion
-- also sets suspendedAt); the purge job keys off deletionState + deletionScheduledAt.

-- CreateEnum
CREATE TYPE "DeletionState" AS ENUM ('ACTIVE', 'PENDING_DELETION');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "deletionState" "DeletionState" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Business" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN "deletionScheduledAt" TIMESTAMP(3);

-- Index the fields the daily purge sweep filters on.
CREATE INDEX "Business_deletionState_deletionScheduledAt_idx" ON "Business"("deletionState", "deletionScheduledAt");
