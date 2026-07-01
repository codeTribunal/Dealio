-- Telegram file_id of the customer's payment-proof screenshot + when it arrived.
-- Proxied on demand via getFile using the business's bot token; never returned
-- raw. Additive and nullable — safe.
ALTER TABLE "Order" ADD COLUMN "paymentProofFileId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentProofAt" TIMESTAMP(3);
