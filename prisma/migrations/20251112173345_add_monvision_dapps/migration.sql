-- CreateTable
CREATE TABLE "monvision_dapps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accountsCount" INTEGER NOT NULL DEFAULT 0,
    "transactionsCount" INTEGER NOT NULL DEFAULT 0,
    "detailsUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "monvision_dapps_name_idx" ON "monvision_dapps"("name");

-- CreateIndex
CREATE INDEX "monvision_dapps_accountsCount_idx" ON "monvision_dapps"("accountsCount");

-- CreateIndex
CREATE INDEX "monvision_dapps_transactionsCount_idx" ON "monvision_dapps"("transactionsCount");
