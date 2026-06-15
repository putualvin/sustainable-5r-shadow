-- CreateTable
CREATE TABLE "RedTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tagNumber" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "photoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RedTag_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RedTag_tagNumber_key" ON "RedTag"("tagNumber");

-- CreateIndex
CREATE INDEX "RedTag_status_idx" ON "RedTag"("status");
