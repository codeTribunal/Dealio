-- Remove the card bank field (Uzcard/Humo). The card is now identified by
-- cardNumber + cardHolderName only. cardNumber/cardHolderName are unaffected.
ALTER TABLE "Business" DROP COLUMN "cardBank";
DROP TYPE "CardBank";
