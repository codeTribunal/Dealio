-- Cardholder name, shown to customers alongside the card number in the bot's
-- checkout payment instructions. Nullable; visibility still gated globally by
-- PlatformSettings.cardPaymentsEnabled.
ALTER TABLE "Business" ADD COLUMN "cardHolderName" TEXT;
