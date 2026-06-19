-- Remove the P2P card payment method (kept order/appointment payment STATUS).

-- AlterTable
ALTER TABLE "Business" DROP COLUMN "cardBank",
DROP COLUMN "cardNumber";

-- DropEnum
DROP TYPE "CardBank";
