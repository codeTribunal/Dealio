-- Make Customer.languagePreference nullable so "null" means the customer has
-- not yet chosen a language (the bot then shows a language picker on first contact).
ALTER TABLE "Customer" ALTER COLUMN "languagePreference" DROP NOT NULL;
ALTER TABLE "Customer" ALTER COLUMN "languagePreference" DROP DEFAULT;
