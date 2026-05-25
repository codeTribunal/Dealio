-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "paymentTerms" TEXT;

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Project_businessId_idx" ON "Project"("businessId");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");
