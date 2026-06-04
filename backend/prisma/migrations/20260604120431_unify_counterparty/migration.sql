/*
  Notes:

  - This migration consolidates Customer and Supplier into Counterparty.
  - Legacy finance/order/after-sales rows are backfilled by matching old foreign keys
    to generated counterparties before the legacy tables are dropped.
*/

CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "remarks" TEXT,
    "isCustomer" BOOLEAN NOT NULL DEFAULT false,
    "isSupplier" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Counterparty" (
    "id",
    "code",
    "name",
    "normalizedName",
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    "isCustomer",
    "isSupplier",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "code",
    "name",
    UPPER(TRIM("name")),
    NULL,
    "phone",
    "email",
    "address",
    NULL,
    true,
    false,
    true,
    "createdAt",
    "updatedAt"
FROM "Customer";

INSERT INTO "Counterparty" (
    "id",
    "code",
    "name",
    "normalizedName",
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    "isCustomer",
    "isSupplier",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "code",
    "name",
    UPPER(TRIM("name")),
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    false,
    true,
    true,
    "createdAt",
    "updatedAt"
FROM "Supplier"
WHERE NOT EXISTS (
    SELECT 1
    FROM "Counterparty"
    WHERE "Counterparty"."normalizedName" = UPPER(TRIM("Supplier"."name"))
);

UPDATE "Counterparty"
SET
    "isSupplier" = true,
    "contactPerson" = COALESCE("contactPerson", (
        SELECT "Supplier"."contactPerson"
        FROM "Supplier"
        WHERE UPPER(TRIM("Supplier"."name")) = "Counterparty"."normalizedName"
        LIMIT 1
    )),
    "remarks" = COALESCE("remarks", (
        SELECT "Supplier"."remarks"
        FROM "Supplier"
        WHERE UPPER(TRIM("Supplier"."name")) = "Counterparty"."normalizedName"
        LIMIT 1
    ))
WHERE EXISTS (
    SELECT 1
    FROM "Supplier"
    WHERE UPPER(TRIM("Supplier"."name")) = "Counterparty"."normalizedName"
);

INSERT INTO "Counterparty" (
    "id",
    "code",
    "name",
    "normalizedName",
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    "isCustomer",
    "isSupplier",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-manual-' || MIN("fb"."id"),
    'LEGACY-' || substr(replace(MIN("fb"."id"), '-', ''), 1, 12),
    "fb"."partner",
    UPPER(TRIM("fb"."partner")),
    NULL,
    NULL,
    NULL,
    NULL,
    'Backfilled from FinancialBill.partner during counterparty migration.',
    MAX(CASE WHEN "fb"."type" = 'RECEIVABLE' THEN 1 ELSE 0 END),
    MAX(CASE WHEN "fb"."type" = 'PAYABLE' THEN 1 ELSE 0 END),
    true,
    MIN("fb"."createdAt"),
    MAX("fb"."updatedAt")
FROM "FinancialBill" AS "fb"
WHERE NOT EXISTS (
    SELECT 1
    FROM "Counterparty"
    WHERE "Counterparty"."normalizedName" = UPPER(TRIM("fb"."partner"))
)
GROUP BY UPPER(TRIM("fb"."partner")), "fb"."partner";

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AfterSalesCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivedDate" DATETIME NOT NULL,
    "counterpartyId" TEXT NOT NULL,
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
    CONSTRAINT "AfterSalesCase_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_goodsMoveId_fkey" FOREIGN KEY ("goodsMoveId") REFERENCES "GoodsMove" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AfterSalesCase_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AfterSalesCase" (
    "id",
    "receivedDate",
    "counterpartyId",
    "customerAddressSnapshot",
    "shipmentTrackingNumber",
    "itemId",
    "qty",
    "salesOrderId",
    "warehouseId",
    "goodsMoveId",
    "type",
    "processedDate",
    "shipBackAddress",
    "note",
    "handlerId",
    "status",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "receivedDate",
    "customerId",
    "customerAddressSnapshot",
    "shipmentTrackingNumber",
    "itemId",
    "qty",
    "salesOrderId",
    "warehouseId",
    "goodsMoveId",
    "type",
    "processedDate",
    "shipBackAddress",
    "note",
    "handlerId",
    "status",
    "createdAt",
    "updatedAt"
FROM "AfterSalesCase";

DROP TABLE "AfterSalesCase";
ALTER TABLE "new_AfterSalesCase" RENAME TO "AfterSalesCase";

CREATE TABLE "new_FinancialBill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currencyId" TEXT NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "counterpartyNameSnapshot" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialBill_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialBill_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_FinancialBill" (
    "id",
    "type",
    "amount",
    "currencyId",
    "paidAmount",
    "status",
    "counterpartyId",
    "counterpartyNameSnapshot",
    "sourceType",
    "sourceId",
    "description",
    "dueDate",
    "createdAt",
    "updatedAt"
)
SELECT
    "fb"."id",
    "fb"."type",
    "fb"."amount",
    "fb"."currencyId",
    "fb"."paidAmount",
    "fb"."status",
    "cp"."id",
    "cp"."name",
    'MANUAL',
    NULL,
    "fb"."description",
    "fb"."dueDate",
    "fb"."createdAt",
    "fb"."updatedAt"
FROM "FinancialBill" AS "fb"
JOIN "Counterparty" AS "cp" ON "cp"."normalizedName" = UPPER(TRIM("fb"."partner"));

DROP TABLE "FinancialBill";
ALTER TABLE "new_FinancialBill" RENAME TO "FinancialBill";

CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
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
    CONSTRAINT "PurchaseOrder_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_PurchaseOrder" (
    "id",
    "orderNo",
    "counterpartyId",
    "itemId",
    "qty",
    "price",
    "totalPrice",
    "currencyId",
    "status",
    "expectedDate",
    "receivedQty",
    "orderDate",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "orderNo",
    COALESCE(
        (
            SELECT "cp"."id"
            FROM "Supplier" AS "s"
            JOIN "Counterparty" AS "cp" ON "cp"."normalizedName" = UPPER(TRIM("s"."name"))
            WHERE "s"."id" = "PurchaseOrder"."supplierId"
            LIMIT 1
        ),
        "supplierId"
    ),
    "itemId",
    "qty",
    "price",
    "totalPrice",
    "currencyId",
    "status",
    "expectedDate",
    "receivedQty",
    "orderDate",
    "createdAt",
    "updatedAt"
FROM "PurchaseOrder";

DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE UNIQUE INDEX "PurchaseOrder_orderNo_key" ON "PurchaseOrder"("orderNo");

CREATE TABLE "new_SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "currencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesOrder_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_SalesOrder" (
    "id",
    "orderNo",
    "counterpartyId",
    "itemId",
    "qty",
    "price",
    "totalPrice",
    "currencyId",
    "status",
    "orderDate",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "orderNo",
    COALESCE(
        (
            SELECT "cp"."id"
            FROM "Customer" AS "c"
            JOIN "Counterparty" AS "cp" ON "cp"."normalizedName" = UPPER(TRIM("c"."name"))
            WHERE "c"."id" = "SalesOrder"."customerId"
            LIMIT 1
        ),
        "customerId"
    ),
    "itemId",
    "qty",
    "price",
    "totalPrice",
    "currencyId",
    "status",
    "orderDate",
    "createdAt",
    "updatedAt"
FROM "SalesOrder";

DROP TABLE "SalesOrder";
ALTER TABLE "new_SalesOrder" RENAME TO "SalesOrder";
CREATE UNIQUE INDEX "SalesOrder_orderNo_key" ON "SalesOrder"("orderNo");

DROP INDEX "Customer_name_key";
DROP INDEX "Customer_code_key";
DROP TABLE "Customer";

DROP INDEX "Supplier_name_key";
DROP INDEX "Supplier_code_key";
DROP TABLE "Supplier";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "Counterparty_code_key" ON "Counterparty"("code");
CREATE UNIQUE INDEX "Counterparty_name_key" ON "Counterparty"("name");
CREATE UNIQUE INDEX "Counterparty_normalizedName_key" ON "Counterparty"("normalizedName");
