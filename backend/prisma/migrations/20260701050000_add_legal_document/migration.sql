-- Legal-document versioning (admin-controlled). The document TEXT stays in the
-- codebase (web/lib/legalConfig.ts); this table tracks ONLY the in-force VERSION
-- per document. Publishing a new PRIVACY version is what forces re-consent
-- (customers via the bot consent gate, owners via the login CONSENT_REQUIRED
-- gate); both now read the DB version instead of a hardcoded constant.

-- CreateEnum
CREATE TYPE "LegalDocType" AS ENUM ('PRIVACY', 'OFFER');

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "docType" "LegalDocType" NOT NULL,
    "version" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedByAdminId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (one row per document type)
CREATE UNIQUE INDEX "LegalDocument_docType_key" ON "LegalDocument"("docType");

-- Seed both rows at the current in-force baseline so nothing is null at boot.
-- PRIVACY uses the existing customer CONSENT_VERSION ('2026-07-01') so EXISTING
-- customer consents remain valid until a real admin publish. OFFER had no prior
-- version; it starts at the same baseline. updatedAt has no DB default (Prisma
-- @updatedAt is app-managed) so it is set explicitly here.
INSERT INTO "LegalDocument" ("id", "docType", "version", "publishedAt", "updatedAt")
VALUES
  ('legaldoc_privacy', 'PRIVACY', '2026-07-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('legaldoc_offer',   'OFFER',   '2026-07-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- One-time OWNER baseline reconciliation. Existing owner consents were recorded
-- at the old hardcoded CURRENT_POLICY_VERSION ('1.0'); the owner login gate now
-- compares against the DB PRIVACY version ('2026-07-01'). Relabel existing '1.0'
-- records to the unified baseline so existing owner consents STAY VALID on deploy
-- (no mass re-consent) — only a real admin publish invalidates thereafter. This
-- changes the version label ONLY; the consent booleans and timestamps are left
-- intact. No-op when there are no '1.0' records (e.g. pre-launch).
UPDATE "ConsentRecord" SET "policyVersion" = '2026-07-01' WHERE "policyVersion" = '1.0';
