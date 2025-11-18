-- AlterTable
ALTER TABLE "monvision_dapps" ADD COLUMN "category" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "description" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "discord" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "docs" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "github" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "telegram" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "twitter" TEXT;
ALTER TABLE "monvision_dapps" ADD COLUMN "website" TEXT;

-- CreateTable
CREATE TABLE "monvision_contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "dappId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "monvision_contracts_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "monvision_dapps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "monvision_contracts_address_idx" ON "monvision_contracts"("address");

-- CreateIndex
CREATE INDEX "monvision_contracts_dappId_idx" ON "monvision_contracts"("dappId");

-- CreateIndex
CREATE UNIQUE INDEX "monvision_contracts_dappId_address_key" ON "monvision_contracts"("dappId", "address");

-- CreateIndex
CREATE INDEX "monvision_dapps_category_idx" ON "monvision_dapps"("category");
