-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "acceptToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_acceptToken_key" ON "Project"("acceptToken");
