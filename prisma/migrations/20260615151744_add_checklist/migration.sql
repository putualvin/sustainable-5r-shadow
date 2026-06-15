-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChecklistRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "shift" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChecklistRun_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChecklistResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "compliant" BOOLEAN NOT NULL,
    "note" TEXT,
    "photoPath" TEXT,
    CONSTRAINT "ChecklistResponse_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChecklistRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChecklistResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChecklistItem_group_idx" ON "ChecklistItem"("group");

-- CreateIndex
CREATE INDEX "ChecklistRun_areaId_idx" ON "ChecklistRun"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistRun_areaId_date_shift_key" ON "ChecklistRun"("areaId", "date", "shift");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistResponse_runId_itemId_key" ON "ChecklistResponse"("runId", "itemId");
