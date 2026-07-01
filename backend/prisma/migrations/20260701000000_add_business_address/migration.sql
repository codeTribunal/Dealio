-- Add the optional physical address to Business.
-- Pickup location (PRODUCTS) and appointment location (SERVICES) — one field,
-- both uses. Additive and nullable: safe, never blocks onboarding.
ALTER TABLE "Business" ADD COLUMN "address" TEXT;
