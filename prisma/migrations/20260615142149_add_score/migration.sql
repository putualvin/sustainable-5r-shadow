-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "countDone" INTEGER NOT NULL DEFAULT 0,
    "countProgress" INTEGER NOT NULL DEFAULT 0,
    "countNoProgress" INTEGER NOT NULL DEFAULT 0,
    "finalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Score_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Score_period_idx" ON "Score"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Score_areaId_period_key" ON "Score"("areaId", "period");
