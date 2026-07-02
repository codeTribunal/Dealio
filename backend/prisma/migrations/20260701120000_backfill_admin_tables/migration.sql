-- Backfill for tables that existed on production only out-of-band (created via
-- `prisma db push` before the admin-panel work was migration-tracked):
-- AdminRole enum + AdminUser, AuditLog, UsageLog. Shapes mirror production
-- information_schema, cross-checked against schema.prisma.
--
-- AdminUser deliberately EXCLUDES failedLoginCount / lockedUntil — the
-- 20260702000000_admin_login_lockout migration adds those on top of this.
--
-- On production this migration is never executed: it is baselined with
-- `prisma migrate resolve --applied` because the tables already exist there.

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- Business drift that was also db push'd out-of-band on production: the
-- subscription plan, suspension fields, and the encrypted bot-token triple
-- replacing the plaintext botToken column (verified against production
-- information_schema — production has NO botToken column and NO
-- Business_botToken_key index). IF EXISTS keeps the drops inert on databases
-- where they are already gone.
DROP INDEX IF EXISTS "Business_botToken_key";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "botToken";
ALTER TABLE "Business"
  ADD COLUMN "botTokenEncrypted" TEXT,
  ADD COLUMN "botTokenIv" TEXT,
  ADD COLUMN "botTokenTag" TEXT,
  ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPPORT',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "appointments" INTEGER NOT NULL DEFAULT 0,
    "customers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AuditLog_adminUserId_idx" ON "AuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "UsageLog_businessId_idx" ON "UsageLog"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageLog_businessId_month_key" ON "UsageLog"("businessId", "month");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Housekeeping for FRESH databases only. The Message table was created by the
-- init migration, but the feature was removed: the model no longer exists in
-- schema.prisma and PRODUCTION ALREADY HAS NO "Message" TABLE (dropped
-- out-of-band there). Dropping it here brings fresh environments in line with
-- production and schema.prisma (verified via `prisma migrate diff` = empty).
-- IF EXISTS keeps the statement inert anywhere it is already gone; on
-- production this whole migration is resolve-only and never runs.
DROP TABLE IF EXISTS "Message";
