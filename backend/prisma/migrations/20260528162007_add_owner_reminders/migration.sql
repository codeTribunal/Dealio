-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "reminderSettings" JSONB;

-- CreateTable
CREATE TABLE "SentReminder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reminderKind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentReminder_businessId_idx" ON "SentReminder"("businessId");

-- CreateIndex
CREATE INDEX "SentReminder_entityId_idx" ON "SentReminder"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SentReminder_businessId_entityType_entityId_reminderKind_key" ON "SentReminder"("businessId", "entityType", "entityId", "reminderKind");

-- AddForeignKey
ALTER TABLE "SentReminder" ADD CONSTRAINT "SentReminder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
