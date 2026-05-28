-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "calendarToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_calendarToken_key" ON "Business"("calendarToken");
