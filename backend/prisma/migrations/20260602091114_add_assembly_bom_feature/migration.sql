-- CreateTable
CREATE TABLE "BomComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentItemId" TEXT NOT NULL,
    "componentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BomComponent_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BomComponent_componentItemId_fkey" FOREIGN KEY ("componentItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssemblyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "assembledItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCost" REAL NOT NULL DEFAULT 0.0,
    "warehouseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssemblyLog_assembledItemId_fkey" FOREIGN KEY ("assembledItemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssemblyLog_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssemblyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '件',
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MATERIAL',
    "cost" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" ("code", "createdAt", "description", "id", "name", "unit", "updatedAt") SELECT "code", "createdAt", "description", "id", "name", "unit", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "canAccessUsers" BOOLEAN NOT NULL DEFAULT false,
    "canAccessWarehouse" BOOLEAN NOT NULL DEFAULT false,
    "canAccessGoods" BOOLEAN NOT NULL DEFAULT false,
    "canAccessFinance" BOOLEAN NOT NULL DEFAULT false,
    "canAccessProducts" BOOLEAN NOT NULL DEFAULT false,
    "canAccessSales" BOOLEAN NOT NULL DEFAULT false,
    "canAccessPurchase" BOOLEAN NOT NULL DEFAULT false,
    "canAccessAssembly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Role" ("canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "createdAt", "id", "name", "protected", "updatedAt") SELECT "canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "createdAt", "id", "name", "protected", "updatedAt" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BomComponent_parentItemId_componentItemId_key" ON "BomComponent"("parentItemId", "componentItemId");
