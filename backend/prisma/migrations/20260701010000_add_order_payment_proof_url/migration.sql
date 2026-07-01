-- URL of the customer-uploaded payment proof (screenshot of the P2P card
-- transfer), stored in R2. Nullable; set when the customer sends the screenshot
-- after tapping "I have paid". Additive and nullable: safe.
ALTER TABLE "Order" ADD COLUMN "paymentProofUrl" TEXT;
