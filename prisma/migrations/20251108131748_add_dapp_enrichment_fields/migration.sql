-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_dapps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "banner" TEXT,
    "symbol" TEXT,
    "website" TEXT,
    "github" TEXT,
    "twitter" TEXT,
    "category" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "detectionSource" TEXT NOT NULL DEFAULT 'AUTO',
    "githubId" TEXT,
    "qualityScore" REAL NOT NULL DEFAULT 0,
    "activityScore" REAL NOT NULL DEFAULT 0,
    "diversityScore" REAL NOT NULL DEFAULT 0,
    "ageScore" REAL NOT NULL DEFAULT 0,
    "totalTxCount" INTEGER NOT NULL DEFAULT 0,
    "totalEventCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "tvlUsd" REAL NOT NULL DEFAULT 0,
    "firstActivity" DATETIME,
    "lastActivity" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_dapps" ("activityScore", "ageScore", "category", "createdAt", "description", "detectionSource", "diversityScore", "id", "logoUrl", "name", "qualityScore", "status", "symbol", "totalTxCount", "tvlUsd", "uniqueUsers", "updatedAt", "website") SELECT "activityScore", "ageScore", "category", "createdAt", "description", "detectionSource", "diversityScore", "id", "logoUrl", "name", "qualityScore", "status", "symbol", "totalTxCount", "tvlUsd", "uniqueUsers", "updatedAt", "website" FROM "dapps";
DROP TABLE "dapps";
ALTER TABLE "new_dapps" RENAME TO "dapps";
CREATE UNIQUE INDEX "dapps_githubId_key" ON "dapps"("githubId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
