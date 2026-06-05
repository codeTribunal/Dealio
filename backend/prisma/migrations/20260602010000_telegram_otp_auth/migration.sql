-- Telegram OTP auth: hashed one-time codes + enrollment deep-link tokens.
--
-- Replaces the old plaintext-code OtpCode shape with a hashed, multi-purpose
-- design (ENROLL | LOGIN) and adds LinkToken for first-time enrollment plus
-- the Telegram binding columns on User.

-- Existing OtpCode rows are short-lived dev OTPs (≤10 min) with no codeHash.
-- Clear them before adding the NOT NULL codeHash column so the ALTER succeeds.
DELETE FROM "OtpCode";

-- DropIndex
DROP INDEX "OtpCode_phone_idx";

-- AlterTable
ALTER TABLE "OtpCode" DROP COLUMN "code",
DROP COLUMN "used",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "chatId" TEXT,
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "purpose" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "phone" TEXT,
    "chatId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkToken_token_key" ON "LinkToken"("token");

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");
