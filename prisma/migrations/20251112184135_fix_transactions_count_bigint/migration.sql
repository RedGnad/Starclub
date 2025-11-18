-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_monvision_dapps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accountsCount" INTEGER NOT NULL DEFAULT 0,
    "transactionsCount" BIGINT NOT NULL DEFAULT 0,
    "detailsUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_monvision_dapps" ("accountsCount", "createdAt", "detailsUrl", "id", "logoUrl", "name", "transactionsCount", "updatedAt") SELECT "accountsCount", "createdAt", "detailsUrl", "id", "logoUrl", "name", "transactionsCount", "updatedAt" FROM "monvision_dapps";
DROP TABLE "monvision_dapps";
ALTER TABLE "new_monvision_dapps" RENAME TO "monvision_dapps";
CREATE INDEX "monvision_dapps_name_idx" ON "monvision_dapps"("name");
CREATE INDEX "monvision_dapps_accountsCount_idx" ON "monvision_dapps"("accountsCount");
CREATE INDEX "monvision_dapps_transactionsCount_idx" ON "monvision_dapps"("transactionsCount");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
