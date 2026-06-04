/*
  Warnings:

  - Added the required column `currencyId` to the `AssemblyLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `FinancialBill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `Item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `PaymentAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `PurchaseOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currencyId` to the `SalesOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaymentAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "usernameSnapshot" TEXT,
    "roleIdSnapshot" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "durationMs" INTEGER,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssemblyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "assembledItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalCost" REAL NOT NULL DEFAULT 0.0,
    "currencyId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssemblyLog_assembledItemId_fkey" FOREIGN KEY ("assembledItemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssemblyLog_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssemblyLog_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssemblyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AssemblyLog" ("assembledItemId", "createdAt", "id", "quantity", "remarks", "totalCost", "type", "userId", "warehouseId") SELECT "assembledItemId", "createdAt", "id", "quantity", "remarks", "totalCost", "type", "userId", "warehouseId" FROM "AssemblyLog";
DROP TABLE "AssemblyLog";
ALTER TABLE "new_AssemblyLog" RENAME TO "AssemblyLog";
CREATE TABLE "new_FinancialBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currencyId" TEXT NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialBill_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FinancialBill" ("amount", "createdAt", "description", "dueDate", "id", "paidAmount", "partner", "status", "type", "updatedAt") SELECT "amount", "createdAt", "description", "dueDate", "id", "paidAmount", "partner", "status", "type", "updatedAt" FROM "FinancialBill";
DROP TABLE "FinancialBill";
ALTER TABLE "new_FinancialBill" RENAME TO "FinancialBill";
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '件',
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'MATERIAL',
    "cost" REAL NOT NULL DEFAULT 0.0,
    "currencyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("code", "cost", "createdAt", "description", "id", "name", "type", "unit", "updatedAt") SELECT "code", "cost", "createdAt", "description", "id", "name", "type", "unit", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");
CREATE TABLE "new_PaymentAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "holder" TEXT,
    "balance" REAL NOT NULL DEFAULT 0.0,
    "currencyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentAccount_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PaymentAccount" ("accountNo", "createdAt", "holder", "id", "name", "type", "updatedAt") SELECT "accountNo", "createdAt", "holder", "id", "name", "type", "updatedAt" FROM "PaymentAccount";
DROP TABLE "PaymentAccount";
ALTER TABLE "new_PaymentAccount" RENAME TO "PaymentAccount";
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "currencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expectedDate" DATETIME,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("createdAt", "expectedDate", "id", "itemId", "orderDate", "orderNo", "price", "qty", "receivedQty", "status", "supplierId", "totalPrice", "updatedAt") SELECT "createdAt", "expectedDate", "id", "itemId", "orderDate", "orderNo", "price", "qty", "receivedQty", "status", "supplierId", "totalPrice", "updatedAt" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_orderNo_key" ON "PurchaseOrder"("orderNo");
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
    "canAccessAudit" BOOLEAN NOT NULL DEFAULT false,
    "canViewCost" BOOLEAN NOT NULL DEFAULT false,
    "canViewSalesPrice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Role" ("canAccessAssembly", "canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "createdAt", "id", "name", "protected", "updatedAt") SELECT "canAccessAssembly", "canAccessFinance", "canAccessGoods", "canAccessProducts", "canAccessPurchase", "canAccessSales", "canAccessUsers", "canAccessWarehouse", "createdAt", "id", "name", "protected", "updatedAt" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE TABLE "new_SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "currencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SalesOrder" ("createdAt", "customerId", "id", "itemId", "orderDate", "orderNo", "price", "qty", "status", "totalPrice", "updatedAt") SELECT "createdAt", "customerId", "id", "itemId", "orderDate", "orderNo", "price", "qty", "status", "totalPrice", "updatedAt" FROM "SalesOrder";
DROP TABLE "SalesOrder";
ALTER TABLE "new_SalesOrder" RENAME TO "SalesOrder";
CREATE UNIQUE INDEX "SalesOrder_orderNo_key" ON "SalesOrder"("orderNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
