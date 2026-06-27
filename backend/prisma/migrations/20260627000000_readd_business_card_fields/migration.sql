-- Re-add P2P card payment storage (Uzcard/Humo) on Business. Visibility is
-- gated globally by PlatformSettings.cardPaymentsEnabled (the flag never clears
-- this data). Reverses 20260618000000_remove_payment_method.

-- CreateEnum
CREATE TYPE "CardBank" AS ENUM ('UZCARD', 'HUMO');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "cardNumber" TEXT,
ADD COLUMN "cardBank" "CardBank";
