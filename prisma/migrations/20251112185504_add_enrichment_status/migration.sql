-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_monvision_dapps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "category" TEXT,
    "website" TEXT,
    "twitter" TEXT,
    "discord" TEXT,
    "telegram" TEXT,
    "github" TEXT,
    "docs" TEXT,
    "detailsUrl" TEXT,
    "accountsCount" INTEGER NOT NULL DEFAULT 0,
    "transactionsCount" BIGINT NOT NULL DEFAULT 0,
    "isEnriched" BOOLEAN NOT NULL DEFAULT false,
    "enrichedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_monvision_dapps" ("accountsCount", "createdAt", "detailsUrl", "id", "logoUrl", "name", "transactionsCount", "updatedAt") SELECT "accountsCount", "createdAt", "detailsUrl", "id", "logoUrl", "name", "transactionsCount", "updatedAt" FROM "monvision_dapps";
DROP TABLE "monvision_dapps";
ALTER TABLE "new_monvision_dapps" RENAME TO "monvision_dapps";
CREATE INDEX "monvision_dapps_name_idx" ON "monvision_dapps"("name");
CREATE INDEX "monvision_dapps_category_idx" ON "monvision_dapps"("category");
CREATE INDEX "monvision_dapps_accountsCount_idx" ON "monvision_dapps"("accountsCount");
CREATE INDEX "monvision_dapps_transactionsCount_idx" ON "monvision_dapps"("transactionsCount");
CREATE INDEX "monvision_dapps_isEnriched_idx" ON "monvision_dapps"("isEnriched");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
