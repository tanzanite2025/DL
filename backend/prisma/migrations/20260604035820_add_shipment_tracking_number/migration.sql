-- CreateTable
CREATE TABLE "AfterSalesCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivedDate" DATETIME NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerAddressSnapshot" TEXT,
    "shipmentTrackingNumber" TEXT,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "salesOrderId" TEXT,
    "warehouseId" TEXT,
    "goodsMoveId" TEXT,
    "type" TEXT NOT NULL,
    "processedDate" DATETIME,
    "shipBackAddress" TEXT,
    "note" TEXT,
    "handlerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AfterSalesCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_goodsMoveId_fkey" FOREIGN KEY ("goodsMoveId") REFERENCES "GoodsMove" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "canAccessAfterSales" BOOLEAN NOT NULL DEFAULT false,
    "canAccessPurchase" BOOLEAN NOT NULL DEFAULT false,
    "canAccessAssembly" BOOLEAN NOT NULL DEFAULT false,
    "canAccessAudit" BOOLEAN NOT NULL DEFAULT false,
    "canViewCost" BOOLEAN NOT NULL DEFAULT false,
    "canViewSalesPrice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Role" ("canAccessAssembly", "canAccessAudit", "canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "canViewCost", "canViewSalesPrice", "createdAt", "id", "name", "protected", "updatedAt") SELECT "canAccessAssembly", "canAccessAudit", "canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "canViewCost", "canViewSalesPrice", "createdAt", "id", "name", "protected", "updatedAt" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
