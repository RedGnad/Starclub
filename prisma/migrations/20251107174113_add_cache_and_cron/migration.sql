-- CreateTable
CREATE TABLE "protocol_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cron_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "error" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "protocol_cache_key_key" ON "protocol_cache"("key");

-- CreateIndex
CREATE INDEX "protocol_cache_key_idx" ON "protocol_cache"("key");

-- CreateIndex
CREATE INDEX "protocol_cache_expiresAt_idx" ON "protocol_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "cron_jobs_name_key" ON "cron_jobs"("name");

-- CreateIndex
CREATE INDEX "cron_jobs_name_idx" ON "cron_jobs"("name");

-- CreateIndex
CREATE INDEX "cron_jobs_nextRun_idx" ON "cron_jobs"("nextRun");
