-- CreateTable
CREATE TABLE "dapps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "symbol" TEXT,
    "website" TEXT,
    "category" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "detectionSource" TEXT NOT NULL DEFAULT 'AUTO',
    "qualityScore" REAL NOT NULL DEFAULT 0,
    "activityScore" REAL NOT NULL DEFAULT 0,
    "diversityScore" REAL NOT NULL DEFAULT 0,
    "ageScore" REAL NOT NULL DEFAULT 0,
    "totalTxCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "tvlUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "bytecodeHash" TEXT,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "deploymentDate" DATETIME,
    "creatorAddress" TEXT,
    "transactionHash" TEXT,
    "blockNumber" BIGINT,
    "name" TEXT,
    "symbol" TEXT,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dappId" TEXT,
    CONSTRAINT "contracts_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "dapps" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txCount" INTEGER NOT NULL DEFAULT 0,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "gasUsed" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dappId" TEXT NOT NULL,
    CONSTRAINT "activities_dappId_fkey" FOREIGN KEY ("dappId") REFERENCES "dapps" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "block_scan_state" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastBlockScanned" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_address_key" ON "contracts"("address");

-- CreateIndex
CREATE INDEX "contracts_address_idx" ON "contracts"("address");

-- CreateIndex
CREATE INDEX "contracts_dappId_idx" ON "contracts"("dappId");

-- CreateIndex
CREATE INDEX "contracts_deploymentDate_idx" ON "contracts"("deploymentDate");

-- CreateIndex
CREATE INDEX "contracts_eventCount_idx" ON "contracts"("eventCount");

-- CreateIndex
CREATE INDEX "activities_dappId_idx" ON "activities"("dappId");

-- CreateIndex
CREATE INDEX "activities_date_idx" ON "activities"("date");

-- CreateIndex
CREATE UNIQUE INDEX "activities_dappId_date_key" ON "activities"("dappId", "date");
