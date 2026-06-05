# Unified Counterparty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the remaining customer and supplier split with one unified counterparty flow backed by a single `roleType` field, then reconnect sales, procurement, finance, after-sales, and global search to that model.

**Architecture:** Keep the existing unified `Counterparty` table, but replace `isCustomer` and `isSupplier` with one persisted string field `roleType` using the literals `CUSTOMER`, `SUPPLIER`, and `BOTH`. Backend validation and frontend filtering should both derive customer and supplier capability from that field, while finance and ledger features use `counterpartyId` plus `counterpartyNameSnapshot` everywhere.

**Tech Stack:** Prisma + SQLite, Express + TypeScript, React + TypeScript, node:test, tsx, Vite, existing UDS components

---

## File Map

### Backend files to modify

- `backend/prisma/schema.prisma`
  - Replace `Counterparty.isCustomer` and `Counterparty.isSupplier` with `Counterparty.roleType`.
- `backend/prisma/migrations/*_counterparty_role_type/migration.sql`
  - Migrate existing `Counterparty` rows to `roleType` and rebuild the table for SQLite.
- `backend/src/lib/counterpartyRules.ts`
  - Normalize names, derive capability from `roleType`, generate codes, and gate counterparty read and manage permissions.
- `backend/src/lib/prisma.ts`
  - No logic change expected, but compile must stay green after Prisma client regeneration.
- `backend/src/lib/counterpartyLedger.ts`
  - Build AR/AP/net summaries for a counterparty ledger payload.
- `backend/src/lib/counterpartyDocuments.ts`
  - Build manual finance bill payloads and sales-order-generated finance bill payloads from counterparty data.
- `backend/src/routes/counterparties.routes.ts`
  - Counterparty CRUD, role-filtered search, and counterparty ledger endpoint.
- `backend/src/routes/sales.routes.ts`
  - Replace customer CRUD references and switch sales orders to `counterpartyId`.
- `backend/src/routes/purchase.routes.ts`
  - Replace supplier CRUD references and switch purchase orders to `counterpartyId`.
- `backend/src/routes/finance.routes.ts`
  - Replace free-text `partner` input with `counterpartyId`.
- `backend/src/routes/afterSales.routes.ts`
  - Replace `customerId` with `counterpartyId` and enforce customer-capable role.
- `backend/src/routes/search.routes.ts`
  - Return `counterparties` instead of `customers`, and query order and after-sales relations through `counterparty`.
- `backend/src/server.ts`
  - Mount the new counterparty routes and keep seeding logic free of removed customer and supplier assumptions.

### Backend files to create

- `backend/tests/counterpartyLedger.test.ts`
  - Unit coverage for AR/AP/net aggregation.
- `backend/tests/counterpartyDocuments.test.ts`
  - Unit coverage for finance bill payload builders.

### Backend files to modify in tests

- `backend/tests/counterpartyRules.test.ts`
  - Replace boolean-role assertions with `roleType` assertions.
- `backend/tests/counterpartyPrisma.test.ts`
  - Prove that Prisma can create a `Counterparty` using `roleType`.

### Frontend files to create

- `frontend/src/hooks/useCounterparties.ts`
  - Shared hook for role-filtered counterparty list, CRUD, search, and ledger loading.
- `frontend/src/components/counterparties/CounterpartyForm.tsx`
  - Shared create and edit form that maps checkbox input to persisted `roleType`.
- `frontend/src/components/counterparties/CounterpartyPicker.tsx`
  - Search and select input for finance and other screens.
- `frontend/src/components/counterparties/CounterpartyLedgerModal.tsx`
  - Finance-facing counterparty ledger modal.
- `frontend/src/components/counterparties/counterpartyUtils.ts`
  - Shared frontend role and label helpers.
- `frontend/tests/counterpartyUtils.test.ts`
  - Unit coverage for role mapping and display labels.

### Frontend files to modify

- `frontend/src/types/index.ts`
  - Add `Counterparty`, `CounterpartyRoleType`, `CounterpartyLedger`, and replace remaining `customer` and `supplier` field shapes in shared models.
- `frontend/src/services/api.ts`
  - Add `counterpartiesApi` and switch finance, sales, purchase, and after-sales payloads to `counterpartyId`.
- `frontend/src/hooks/useCustomers.ts`
  - Convert to a thin wrapper over `useCounterparties('customer')`.
- `frontend/src/hooks/useSuppliers.ts`
  - Convert to a thin wrapper over `useCounterparties('supplier')`.
- `frontend/src/hooks/useFinance.ts`
  - Keep current behavior, but accept `counterpartyId` and expose counterparty-ledger loading cleanly.
- `frontend/src/hooks/useSalesOrders.ts`
  - No new behavior, but type signatures must move from `customerId` to `counterpartyId`.
- `frontend/src/hooks/usePurchaseOrders.ts`
  - No new behavior, but type signatures must move from `supplierId` to `counterpartyId`.
- `frontend/src/hooks/useAfterSalesCases.ts`
  - No new behavior, but type signatures must move from `customerId` to `counterpartyId`.
- `frontend/src/components/uds/SalesOrderForm.tsx`
  - Batch sales entry must use counterparty ids and customer-capable counterparties.
- `frontend/src/components/uds/PurchaseOrderForm.tsx`
  - Batch purchase entry must use counterparty ids and supplier-capable counterparties.
- `frontend/src/components/afterSales/AfterSalesCaseModal.tsx`
  - Replace customer-specific props and payload fields.
- `frontend/src/pages/SalesManagement.tsx`
  - Replace customer-specific form state with the shared counterparty form and `counterpartyId`.
- `frontend/src/pages/ProcurementManagement.tsx`
  - Replace supplier-specific form state with the shared counterparty form and `counterpartyId`.
- `frontend/src/pages/AfterSalesManagement.tsx`
  - Replace customer-specific state and payloads with counterparty-aware flows.
- `frontend/src/pages/FinanceARAP.tsx`
  - Preserve the current rebuilt structure, but replace `formPartner` and `bill.partner` usage with `counterpartyId` and `counterpartyNameSnapshot`.
- `frontend/src/pages/financeArapUtils.ts`
  - Stay compatible with the updated `FinancialBill` type.
- `frontend/src/App.tsx`
  - Replace `globalSearchResult.customers` with `globalSearchResult.counterparties`.
- `frontend/src/i18n/translations.ts`
  - Add labels for counterparty role, picker, and ledger strings.

## Task 1: Convert Backend Counterparty Rules to `roleType`

**Files:**
- Modify: `backend/src/lib/counterpartyRules.ts`
- Modify: `backend/tests/counterpartyRules.test.ts`

- [ ] **Step 1: Write the failing `roleType` test cases**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeCounterpartyName,
  buildNextCounterpartyCode,
  assertCounterpartyRoleType,
  allowsCounterpartyCapability,
  canReadCounterparties,
  canManageCounterparties,
} from '../src/lib/counterpartyRules.js';

test('normalizeCounterpartyName trims, collapses spaces, and uppercases latin text', () => {
  assert.equal(normalizeCounterpartyName('  Acme   Corp  '), 'ACME CORP');
  assert.equal(normalizeCounterpartyName('  北京   acme  ltd  '), '北京 ACME LTD');
});

test('buildNextCounterpartyCode increments the highest CP code', () => {
  assert.equal(buildNextCounterpartyCode(['CP-0003', 'CP-0010', 'INV-9', 'CP-0007']), 'CP-0011');
  assert.equal(buildNextCounterpartyCode([]), 'CP-0001');
});

test('assertCounterpartyRoleType accepts only CUSTOMER SUPPLIER and BOTH', () => {
  assert.doesNotThrow(() => assertCounterpartyRoleType('CUSTOMER'));
  assert.doesNotThrow(() => assertCounterpartyRoleType('SUPPLIER'));
  assert.doesNotThrow(() => assertCounterpartyRoleType('BOTH'));
  assert.throws(() => assertCounterpartyRoleType(''));
  assert.throws(() => assertCounterpartyRoleType('customer'));
});

test('allowsCounterpartyCapability derives customer and supplier access from roleType', () => {
  assert.equal(allowsCounterpartyCapability('CUSTOMER', 'customer'), true);
  assert.equal(allowsCounterpartyCapability('CUSTOMER', 'supplier'), false);
  assert.equal(allowsCounterpartyCapability('SUPPLIER', 'customer'), false);
  assert.equal(allowsCounterpartyCapability('SUPPLIER', 'supplier'), true);
  assert.equal(allowsCounterpartyCapability('BOTH', 'customer'), true);
  assert.equal(allowsCounterpartyCapability('BOTH', 'supplier'), true);
});

test('counterparty permissions still allow finance to read but not manage', () => {
  const financeRole = {
    protected: false,
    canAccessSales: false,
    canAccessPurchase: false,
    canAccessAfterSales: false,
    canAccessFinance: true,
  };

  assert.equal(canReadCounterparties(financeRole), true);
  assert.equal(canManageCounterparties(financeRole), false);
});
```

- [ ] **Step 2: Run the backend rules test to verify it fails**

Run: `node --import tsx --test tests/counterpartyRules.test.ts`

Expected: FAIL because `assertCounterpartyRoleType` and `allowsCounterpartyCapability` do not exist yet.

- [ ] **Step 3: Implement `roleType`-based backend rules**

```ts
export type CounterpartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
export type CounterpartyCapability = 'customer' | 'supplier';

export type CounterpartyPermissionShape = {
  protected?: boolean;
  canAccessSales?: boolean;
  canAccessPurchase?: boolean;
  canAccessAfterSales?: boolean;
  canAccessFinance?: boolean;
};

const VALID_ROLE_TYPES: CounterpartyRoleType[] = ['CUSTOMER', 'SUPPLIER', 'BOTH'];

export function normalizeCounterpartyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function buildNextCounterpartyCode(existingCodes: string[]): string {
  let highest = 0;

  for (const code of existingCodes) {
    const match = /^CP-(\d+)$/.exec(code);
    if (!match) continue;
    highest = Math.max(highest, Number.parseInt(match[1], 10));
  }

  return `CP-${String(highest + 1).padStart(4, '0')}`;
}

export function assertCounterpartyRoleType(roleType: string): asserts roleType is CounterpartyRoleType {
  if (!VALID_ROLE_TYPES.includes(roleType as CounterpartyRoleType)) {
    throw new Error('Counterparty roleType must be CUSTOMER, SUPPLIER, or BOTH.');
  }
}

export function allowsCounterpartyCapability(
  roleType: CounterpartyRoleType,
  capability: CounterpartyCapability,
): boolean {
  return roleType === 'BOTH' || roleType === capability.toUpperCase();
}

export function canReadCounterparties(role: CounterpartyPermissionShape): boolean {
  return Boolean(
    role.protected ||
      role.canAccessSales ||
      role.canAccessPurchase ||
      role.canAccessAfterSales ||
      role.canAccessFinance,
  );
}

export function canManageCounterparties(role: CounterpartyPermissionShape): boolean {
  return Boolean(role.protected || role.canAccessSales || role.canAccessPurchase || role.canAccessAfterSales);
}
```

- [ ] **Step 4: Run the backend rules test to verify it passes**

Run: `node --import tsx --test tests/counterpartyRules.test.ts`

Expected: PASS with all five tests green.

- [ ] **Step 5: Commit the backend rule conversion**

```bash
git add backend/src/lib/counterpartyRules.ts backend/tests/counterpartyRules.test.ts
git commit -m "test: convert counterparty rules to roleType"
```

## Task 2: Replace Prisma Counterparty Booleans With `roleType`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/prisma/migrations/*_counterparty_role_type/migration.sql`
- Modify: `backend/src/server.ts`
- Modify: `backend/tests/counterpartyPrisma.test.ts`

- [ ] **Step 1: Write the failing Prisma smoke test for `roleType`**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { prisma } from '../src/lib/prisma.js';

test('Prisma can persist a counterparty roleType value', async (t) => {
  const stamp = Date.now();
  const created = await prisma.counterparty.create({
    data: {
      code: `CP-T${stamp}`,
      name: `RoleType Smoke ${stamp}`,
      normalizedName: `ROLETYPE SMOKE ${stamp}`,
      roleType: 'BOTH',
      isActive: true,
    },
  });

  t.after(async () => {
    await prisma.counterparty.delete({ where: { id: created.id } }).catch(() => undefined);
  });

  assert.equal(created.roleType, 'BOTH');
});
```

- [ ] **Step 2: Run the Prisma smoke test to verify it fails**

Run: `node --import tsx --test tests/counterpartyPrisma.test.ts`

Expected: FAIL because the generated Prisma client and database schema still expect `isCustomer` and `isSupplier`.

- [ ] **Step 3: Update Prisma schema and SQLite migration**

```prisma
model Counterparty {
  id             String          @id @default(uuid())
  code           String          @unique
  name           String          @unique
  normalizedName String          @unique
  roleType       String
  contactPerson  String?
  phone          String?
  email          String?
  address        String?
  remarks        String?
  isActive       Boolean         @default(true)
  salesOrders    SalesOrder[]
  purchaseOrders PurchaseOrder[]
  financialBills FinancialBill[]
  afterSales     AfterSalesCase[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

```sql
CREATE TABLE "new_Counterparty" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Counterparty" (
    "id",
    "code",
    "name",
    "normalizedName",
    "roleType",
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "code",
    "name",
    "normalizedName",
    CASE
      WHEN "isCustomer" = 1 AND "isSupplier" = 1 THEN 'BOTH'
      WHEN "isSupplier" = 1 THEN 'SUPPLIER'
      ELSE 'CUSTOMER'
    END,
    "contactPerson",
    "phone",
    "email",
    "address",
    "remarks",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "Counterparty";

DROP TABLE "Counterparty";
ALTER TABLE "new_Counterparty" RENAME TO "Counterparty";
CREATE UNIQUE INDEX "Counterparty_code_key" ON "Counterparty"("code");
CREATE UNIQUE INDEX "Counterparty_name_key" ON "Counterparty"("name");
CREATE UNIQUE INDEX "Counterparty_normalizedName_key" ON "Counterparty"("normalizedName");
```

Also keep `backend/src/server.ts` free of any removed `Customer` or `Supplier` assumptions. The current seed path already avoids creating those tables; only adjust comments if they still mention the removed split model.

- [ ] **Step 4: Regenerate Prisma client, run the migration, and rerun the smoke test**

Run:

```bash
npx prisma migrate dev --name counterparty_role_type
npx prisma generate
node --import tsx --test tests/counterpartyPrisma.test.ts
```

Expected: migration succeeds, Prisma client regenerates, and the smoke test passes with `roleType: 'BOTH'`.

- [ ] **Step 5: Commit the Prisma role-field migration**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/server.ts backend/tests/counterpartyPrisma.test.ts
git commit -m "feat: store counterparty role in roleType"
```

## Task 3: Add Counterparty Ledger Helpers and Counterparty Routes

**Files:**
- Create: `backend/src/lib/counterpartyLedger.ts`
- Create: `backend/src/lib/counterpartyDocuments.ts`
- Create: `backend/src/routes/counterparties.routes.ts`
- Create: `backend/tests/counterpartyLedger.test.ts`
- Create: `backend/tests/counterpartyDocuments.test.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Write the failing ledger and finance-document tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCounterpartyLedger } from '../src/lib/counterpartyLedger.js';
import { buildManualBillDraft, buildSalesOrderBillDraft } from '../src/lib/counterpartyDocuments.js';

test('buildCounterpartyLedger returns AR AP and net position totals', () => {
  const ledger = buildCounterpartyLedger({
    counterparty: {
      id: 'cp-1',
      code: 'CP-0001',
      name: 'Acme',
      roleType: 'BOTH',
      isActive: true,
    },
    bills: [
      { id: 'b1', type: 'RECEIVABLE', amount: 100, paidAmount: 20 },
      { id: 'b2', type: 'PAYABLE', amount: 60, paidAmount: 10 },
    ],
    salesOrders: [{ id: 'so-1', orderNo: 'SO-001' }],
    purchaseOrders: [{ id: 'po-1', orderNo: 'PO-001' }],
  });

  assert.equal(ledger.receivable.total, 100);
  assert.equal(ledger.receivable.pending, 80);
  assert.equal(ledger.payable.total, 60);
  assert.equal(ledger.payable.pending, 50);
  assert.equal(ledger.netPosition, 40);
});

test('buildManualBillDraft stores counterparty id and snapshot', () => {
  const dueDate = new Date('2026-06-20T00:00:00.000Z');
  const result = buildManualBillDraft({
    type: 'RECEIVABLE',
    amount: 250,
    currencyId: 'cny-id',
    description: 'Manual invoice',
    dueDate,
    counterparty: { id: 'cp-1', name: 'Acme' },
  });

  assert.deepEqual(result, {
    type: 'RECEIVABLE',
    amount: 250,
    currencyId: 'cny-id',
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: 'cp-1',
    counterpartyNameSnapshot: 'Acme',
    sourceType: 'MANUAL',
    sourceId: null,
    description: 'Manual invoice',
    dueDate,
  });
});

test('buildSalesOrderBillDraft stores sales order source metadata', () => {
  const dueDate = new Date('2026-06-21T00:00:00.000Z');
  const result = buildSalesOrderBillDraft({
    amount: 300,
    currencyId: 'usd-id',
    dueDate,
    salesOrderId: 'so-77',
    counterparty: { id: 'cp-9', name: 'Northwind' },
    description: 'Sales order receivable',
  });

  assert.equal(result.counterpartyId, 'cp-9');
  assert.equal(result.counterpartyNameSnapshot, 'Northwind');
  assert.equal(result.sourceType, 'SALES_ORDER');
  assert.equal(result.sourceId, 'so-77');
});
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run:

```bash
node --import tsx --test tests/counterpartyLedger.test.ts tests/counterpartyDocuments.test.ts
```

Expected: FAIL because the helper files do not exist yet.

- [ ] **Step 3: Implement ledger helpers, finance-document helpers, and counterparty routes**

```ts
// backend/src/lib/counterpartyLedger.ts
type BillRow = { id: string; type: 'RECEIVABLE' | 'PAYABLE'; amount: number; paidAmount: number };

function summarizeBills(bills: BillRow[]) {
  return bills.reduce(
    (acc, bill) => ({
      total: acc.total + bill.amount,
      paid: acc.paid + bill.paidAmount,
      pending: acc.pending + (bill.amount - bill.paidAmount),
    }),
    { total: 0, paid: 0, pending: 0 },
  );
}

export function buildCounterpartyLedger(input: {
  counterparty: { id: string; code: string; name: string; roleType: 'CUSTOMER' | 'SUPPLIER' | 'BOTH'; isActive: boolean };
  bills: BillRow[];
  salesOrders: Array<{ id: string; orderNo: string }>;
  purchaseOrders: Array<{ id: string; orderNo: string }>;
}) {
  const receivable = summarizeBills(input.bills.filter((bill) => bill.type === 'RECEIVABLE'));
  const payable = summarizeBills(input.bills.filter((bill) => bill.type === 'PAYABLE'));

  return {
    counterparty: input.counterparty,
    receivable,
    payable,
    netPosition: receivable.total - payable.total,
    bills: input.bills,
    salesOrders: input.salesOrders,
    purchaseOrders: input.purchaseOrders,
  };
}
```

```ts
// backend/src/lib/counterpartyDocuments.ts
export function buildManualBillDraft(input: {
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: number;
  currencyId: string;
  description: string | null;
  dueDate: Date;
  counterparty: { id: string; name: string };
}) {
  return {
    type: input.type,
    amount: input.amount,
    currencyId: input.currencyId,
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: input.counterparty.id,
    counterpartyNameSnapshot: input.counterparty.name,
    sourceType: 'MANUAL',
    sourceId: null,
    description: input.description,
    dueDate: input.dueDate,
  };
}

export function buildSalesOrderBillDraft(input: {
  amount: number;
  currencyId: string;
  dueDate: Date;
  salesOrderId: string;
  counterparty: { id: string; name: string };
  description: string | null;
}) {
  return {
    type: 'RECEIVABLE',
    amount: input.amount,
    currencyId: input.currencyId,
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: input.counterparty.id,
    counterpartyNameSnapshot: input.counterparty.name,
    sourceType: 'SALES_ORDER',
    sourceId: input.salesOrderId,
    description: input.description,
    dueDate: input.dueDate,
  };
}
```

```ts
// backend/src/routes/counterparties.routes.ts
router.get('/counterparties', authenticateToken, async (req, res) => {
  const role = String(req.query.role || 'both');
  const keyword = String(req.query.q || '').trim();
  const requestRole = await prisma.role.findUnique({ where: { id: req.user!.roleId } });

  if (!requestRole || !canReadCounterparties(requestRole)) {
    return res.status(403).json({ error: '[CRITICAL] Role cannot read counterparties.' });
  }

  const roleFilter =
    role === 'customer'
      ? { in: ['CUSTOMER', 'BOTH'] }
      : role === 'supplier'
        ? { in: ['SUPPLIER', 'BOTH'] }
        : { in: ['CUSTOMER', 'SUPPLIER', 'BOTH'] };

  const counterparties = await prisma.counterparty.findMany({
    where: {
      isActive: true,
      roleType: roleFilter,
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },
              { code: { contains: keyword } },
              { normalizedName: { contains: keyword.toUpperCase() } },
              { contactPerson: { contains: keyword } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return res.json(counterparties);
});
```

Also include:

- `POST /counterparties`, `PATCH /counterparties/:id`, and `DELETE /counterparties/:id` using `assertCounterpartyRoleType`, `normalizeCounterpartyName`, `buildNextCounterpartyCode`, and `canManageCounterparties`.
- `GET /counterparties/:id/ledger` that loads `financialBills`, `salesOrders`, and `purchaseOrders`, then shapes the response with `buildCounterpartyLedger`.
- `backend/src/server.ts` mount: `app.use('/api', counterpartiesRoutes);`

- [ ] **Step 4: Run the backend helper tests and TypeScript build**

Run:

```bash
node --import tsx --test tests/counterpartyLedger.test.ts tests/counterpartyDocuments.test.ts
npm run build
```

Expected: tests pass and backend TypeScript build succeeds.

- [ ] **Step 5: Commit the counterparty ledger and route foundation**

```bash
git add backend/src/lib/counterpartyLedger.ts backend/src/lib/counterpartyDocuments.ts backend/src/routes/counterparties.routes.ts backend/src/server.ts backend/tests/counterpartyLedger.test.ts backend/tests/counterpartyDocuments.test.ts
git commit -m "feat: add counterparty routes and ledger helpers"
```

## Task 4: Switch Backend Sales, Procurement, Finance, After-Sales, and Search to `counterpartyId`

**Files:**
- Modify: `backend/src/routes/sales.routes.ts`
- Modify: `backend/src/routes/purchase.routes.ts`
- Modify: `backend/src/routes/finance.routes.ts`
- Modify: `backend/src/routes/afterSales.routes.ts`
- Modify: `backend/src/routes/search.routes.ts`

- [ ] **Step 1: Write the failing finance and route-usage compile gate**

Run: `npm run build`

Expected: FAIL after Task 2 because route files still reference `customer`, `supplier`, `customerId`, `supplierId`, and `partner`.

- [ ] **Step 2: Replace route payloads and role checks with `counterpartyId` and `roleType`**

```ts
// backend/src/routes/sales.routes.ts
const { counterpartyId, itemId, qty, price, status, currencyId } = req.body;
const counterparty = await prisma.counterparty.findUnique({ where: { id: counterpartyId } });

if (!counterparty || !counterparty.isActive || !allowsCounterpartyCapability(counterparty.roleType as any, 'customer')) {
  return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not an active customer-capable record.' });
}

const newOrder = await prisma.salesOrder.create({
  data: {
    orderNo: generatedOrderNo,
    counterpartyId,
    itemId,
    qty: parsedQty,
    price: parsedPrice,
    totalPrice,
    currencyId,
    status: status || 'DRAFT',
  },
  include: {
    counterparty: true,
    item: true,
    currency: true,
  },
});
```

```ts
// backend/src/routes/purchase.routes.ts
const { counterpartyId, itemId, qty, price, status, expectedDate, currencyId } = req.body;
const counterparty = await prisma.counterparty.findUnique({ where: { id: counterpartyId } });

if (!counterparty || !counterparty.isActive || !allowsCounterpartyCapability(counterparty.roleType as any, 'supplier')) {
  return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not an active supplier-capable record.' });
}
```

```ts
// backend/src/routes/finance.routes.ts
const { type, amount, counterpartyId, description, dueDate, currencyId } = req.body;
const counterparty = await prisma.counterparty.findUnique({ where: { id: counterpartyId } });

if (!counterparty || !counterparty.isActive) {
  return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not available.' });
}

const newBill = await prisma.financialBill.create({
  data: buildManualBillDraft({
    type,
    amount: parseFloat(amount),
    currencyId,
    description: description || null,
    dueDate: new Date(dueDate),
    counterparty: { id: counterparty.id, name: counterparty.name },
  }),
  include: { currency: true, counterparty: true },
});
```

```ts
// backend/src/routes/afterSales.routes.ts
const { counterpartyId, itemId, qty, type, warehouseId } = req.body;
const counterparty = await prisma.counterparty.findUnique({ where: { id: counterpartyId } });

if (!counterparty || !counterparty.isActive || !allowsCounterpartyCapability(counterparty.roleType as any, 'customer')) {
  return res.status(400).json({ error: '[CRITICAL] Selected counterparty is not an active customer-capable record.' });
}
```

```ts
// backend/src/routes/search.routes.ts
return res.json({
  query: q,
  counterparties: counterpartiesResult,
  items: results.items,
  salesOrders: results.salesOrders,
  purchaseOrders: results.purchaseOrders,
  afterSalesCases: results.afterSalesCases,
  warehouses: results.warehouses,
});
```

Also update all `include` blocks:

- `salesOrder.include.customer` -> `salesOrder.include.counterparty`
- `purchaseOrder.include.supplier` -> `purchaseOrder.include.counterparty`
- `afterSalesCase.include.customer` -> `afterSalesCase.include.counterparty`
- `financialBill.include` should include `counterparty: true`

- [ ] **Step 3: Rebuild and run backend tests after the route conversion**

Run:

```bash
node --import tsx --test tests/counterpartyRules.test.ts tests/counterpartyPrisma.test.ts tests/counterpartyLedger.test.ts tests/counterpartyDocuments.test.ts
npm run build
```

Expected: all backend tests pass and the backend build succeeds.

- [ ] **Step 4: Commit the backend route conversion**

```bash
git add backend/src/routes/sales.routes.ts backend/src/routes/purchase.routes.ts backend/src/routes/finance.routes.ts backend/src/routes/afterSales.routes.ts backend/src/routes/search.routes.ts
git commit -m "feat: switch backend flows to counterparty ids"
```

## Task 5: Add Frontend Counterparty Types, APIs, and Role Utilities

**Files:**
- Create: `frontend/src/components/counterparties/counterpartyUtils.ts`
- Create: `frontend/src/hooks/useCounterparties.ts`
- Create: `frontend/tests/counterpartyUtils.test.ts`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/hooks/useCustomers.ts`
- Modify: `frontend/src/hooks/useSuppliers.ts`
- Modify: `frontend/src/hooks/useFinance.ts`
- Modify: `frontend/src/hooks/useSalesOrders.ts`
- Modify: `frontend/src/hooks/usePurchaseOrders.ts`
- Modify: `frontend/src/hooks/useAfterSalesCases.ts`

- [ ] **Step 1: Write the failing frontend role-utility test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoleTypeFromSelection,
  hasCustomerCapability,
  hasSupplierCapability,
  getCounterpartyRoleLabels,
  buildCounterpartyOptionLabel,
} from '../src/components/counterparties/counterpartyUtils.ts';

test('buildRoleTypeFromSelection maps checkbox state to one persisted roleType', () => {
  assert.equal(buildRoleTypeFromSelection(true, false), 'CUSTOMER');
  assert.equal(buildRoleTypeFromSelection(false, true), 'SUPPLIER');
  assert.equal(buildRoleTypeFromSelection(true, true), 'BOTH');
  assert.throws(() => buildRoleTypeFromSelection(false, false));
});

test('capability helpers derive role access from roleType', () => {
  assert.equal(hasCustomerCapability('CUSTOMER'), true);
  assert.equal(hasCustomerCapability('SUPPLIER'), false);
  assert.equal(hasCustomerCapability('BOTH'), true);
  assert.equal(hasSupplierCapability('CUSTOMER'), false);
  assert.equal(hasSupplierCapability('SUPPLIER'), true);
  assert.equal(hasSupplierCapability('BOTH'), true);
});

test('counterparty role labels and picker labels stay stable', () => {
  assert.deepEqual(getCounterpartyRoleLabels('BOTH'), ['客户', '供应商']);
  assert.equal(
    buildCounterpartyOptionLabel({
      code: 'CP-0007',
      name: 'Northwind',
      roleType: 'BOTH',
    }),
    '[CP-0007] Northwind · 客户/供应商',
  );
});
```

- [ ] **Step 2: Run the frontend utility test to verify it fails**

Run: `node --experimental-strip-types --test tests/counterpartyUtils.test.ts`

Expected: FAIL because the utility file does not exist yet.

- [ ] **Step 3: Implement the shared frontend role utilities and counterparty domain layer**

```ts
// frontend/src/components/counterparties/counterpartyUtils.ts
import type { Counterparty, CounterpartyRoleType } from '../../types';

export function buildRoleTypeFromSelection(customerSelected: boolean, supplierSelected: boolean): CounterpartyRoleType {
  if (customerSelected && supplierSelected) return 'BOTH';
  if (customerSelected) return 'CUSTOMER';
  if (supplierSelected) return 'SUPPLIER';
  throw new Error('At least one counterparty role must be selected.');
}

export function hasCustomerCapability(roleType: CounterpartyRoleType): boolean {
  return roleType === 'CUSTOMER' || roleType === 'BOTH';
}

export function hasSupplierCapability(roleType: CounterpartyRoleType): boolean {
  return roleType === 'SUPPLIER' || roleType === 'BOTH';
}

export function getCounterpartyRoleLabels(roleType: CounterpartyRoleType): string[] {
  if (roleType === 'BOTH') return ['客户', '供应商'];
  return [roleType === 'CUSTOMER' ? '客户' : '供应商'];
}

export function buildCounterpartyOptionLabel(counterparty: Pick<Counterparty, 'code' | 'name' | 'roleType'>): string {
  const roleLabel = getCounterpartyRoleLabels(counterparty.roleType).join('/');
  return `[${counterparty.code}] ${counterparty.name} · ${roleLabel}`;
}
```

```ts
// frontend/src/types/index.ts
export type CounterpartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';

export interface Counterparty {
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  roleType: CounterpartyRoleType;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Customer = Counterparty;
export type Supplier = Counterparty;

export interface FinancialBill {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: number;
  currencyId?: string;
  currency?: Currency;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  counterpartyId: string;
  counterparty?: Counterparty;
  counterpartyNameSnapshot: string;
  sourceType: 'MANUAL' | 'SALES_ORDER' | 'PURCHASE_ORDER';
  sourceId: string | null;
  description: string | null;
  dueDate: string;
  createdAt: string;
}
```

```ts
// frontend/src/services/api.ts
export const counterpartiesApi = {
  list: (params: { role?: 'customer' | 'supplier' | 'both'; q?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.role) search.set('role', params.role);
    if (params.q) search.set('q', params.q);
    const qs = search.toString();
    return request<any[]>(`/counterparties${qs ? `?${qs}` : ''}`);
  },
  create: (data: any) => request('/counterparties', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request(`/counterparties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/counterparties/${id}`, { method: 'DELETE' }),
  getLedger: (id: string) => request<any>(`/counterparties/${id}/ledger`),
};
```

```ts
// frontend/src/hooks/useCounterparties.ts
import { useCallback, useEffect, useState } from 'react';
import type { Counterparty, CounterpartyLedger } from '../types';
import { counterpartiesApi } from '../services/api';

export function useCounterparties(role: 'customer' | 'supplier' | 'both' = 'both') {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounterparties = useCallback(async (q = '') => {
    setIsLoading(true);
    try {
      const data = await counterpartiesApi.list({ role, q: q || undefined });
      setCounterparties(data as Counterparty[]);
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchCounterparties();
  }, [fetchCounterparties]);

  return {
    counterparties,
    isLoading,
    fetchCounterparties,
    createCounterparty: async (payload: any) => {
      const created = await counterpartiesApi.create(payload);
      await fetchCounterparties();
      return created;
    },
    updateCounterparty: async (id: string, payload: any) => {
      const updated = await counterpartiesApi.update(id, payload);
      await fetchCounterparties();
      return updated;
    },
    deleteCounterparty: async (id: string) => {
      const removed = await counterpartiesApi.delete(id);
      await fetchCounterparties();
      return removed;
    },
    loadLedger: async (id: string) => counterpartiesApi.getLedger(id) as Promise<CounterpartyLedger>,
  };
}
```

Also convert the wrapper hooks:

- `useCustomers` returns `customers: counterparties`, `createCustomer: createCounterparty`, `updateCustomer: updateCounterparty`, and `deleteCustomer: deleteCounterparty`.
- `useSuppliers` does the same for `useCounterparties('supplier')`.
- `useFinance`, `useSalesOrders`, `usePurchaseOrders`, and `useAfterSalesCases` keep the same fetch-and-reload pattern, but their payload types change from `customerId` or `supplierId` to `counterpartyId`.

- [ ] **Step 4: Run frontend tests and build after the shared counterparty layer lands**

Run:

```bash
node --experimental-strip-types --test tests/financeArapUtils.test.ts tests/counterpartyUtils.test.ts
npm run build
```

Expected: both frontend tests pass and the frontend build succeeds.

- [ ] **Step 5: Commit the frontend counterparty foundation**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts frontend/src/hooks/useCounterparties.ts frontend/src/hooks/useCustomers.ts frontend/src/hooks/useSuppliers.ts frontend/src/hooks/useFinance.ts frontend/src/hooks/useSalesOrders.ts frontend/src/hooks/usePurchaseOrders.ts frontend/src/hooks/useAfterSalesCases.ts frontend/src/components/counterparties/counterpartyUtils.ts frontend/tests/counterpartyUtils.test.ts
git commit -m "feat: add frontend counterparty domain layer"
```

## Task 6: Build Shared Counterparty UI Components

**Files:**
- Create: `frontend/src/components/counterparties/CounterpartyForm.tsx`
- Create: `frontend/src/components/counterparties/CounterpartyPicker.tsx`
- Create: `frontend/src/components/counterparties/CounterpartyLedgerModal.tsx`
- Modify: `frontend/src/i18n/translations.ts`

- [ ] **Step 1: Extend the frontend utility test with dual-role display expectations**

```ts
test('picker labels and role badges keep customer before supplier for BOTH', () => {
  assert.deepEqual(getCounterpartyRoleLabels('BOTH'), ['客户', '供应商']);
  assert.equal(
    buildCounterpartyOptionLabel({ code: 'CP-0008', name: 'Dual Corp', roleType: 'BOTH' }),
    '[CP-0008] Dual Corp · 客户/供应商',
  );
});
```

- [ ] **Step 2: Run the frontend utility test to verify any missing UI helper logic fails**

Run: `node --experimental-strip-types --test tests/counterpartyUtils.test.ts`

Expected: FAIL if the utility file still lacks the dual-role display behavior required by the new components.

- [ ] **Step 3: Implement the shared form, picker, and ledger modal**

```tsx
// frontend/src/components/counterparties/CounterpartyForm.tsx
import React, { useMemo, useState } from 'react';
import { UdsButton, UdsCard, UdsInput } from '../uds/UdsComponents';
import type { Counterparty } from '../../types';
import { buildRoleTypeFromSelection, hasCustomerCapability, hasSupplierCapability } from './counterpartyUtils';

interface CounterpartyFormProps {
  title: string;
  initialValue?: Counterparty | null;
  defaultRole: 'customer' | 'supplier';
  onSubmit: (payload: {
    name: string;
    roleType: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
    contactPerson: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    remarks: string | null;
  }) => Promise<void>;
  onCancel?: () => void;
}

export const CounterpartyForm: React.FC<CounterpartyFormProps> = ({ title, initialValue, defaultRole, onSubmit, onCancel }) => {
  const defaultRoleState = useMemo(() => {
    if (initialValue) {
      return {
        customer: hasCustomerCapability(initialValue.roleType),
        supplier: hasSupplierCapability(initialValue.roleType),
      };
    }

    return { customer: defaultRole === 'customer', supplier: defaultRole === 'supplier' };
  }, [defaultRole, initialValue]);

  const [name, setName] = useState(initialValue?.name ?? '');
  const [contactPerson, setContactPerson] = useState(initialValue?.contactPerson ?? '');
  const [phone, setPhone] = useState(initialValue?.phone ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [address, setAddress] = useState(initialValue?.address ?? '');
  const [remarks, setRemarks] = useState(initialValue?.remarks ?? '');
  const [customerSelected, setCustomerSelected] = useState(defaultRoleState.customer);
  const [supplierSelected, setSupplierSelected] = useState(defaultRoleState.supplier);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <UdsCard title={title}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            await onSubmit({
              name: name.trim(),
              roleType: buildRoleTypeFromSelection(customerSelected, supplierSelected),
              contactPerson: contactPerson.trim() || null,
              phone: phone.trim() || null,
              email: email.trim() || null,
              address: address.trim() || null,
              remarks: remarks.trim() || null,
            });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <UdsInput label="往来主体名称" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={customerSelected} onChange={(e) => setCustomerSelected(e.target.checked)} />
            <span>客户</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={supplierSelected} onChange={(e) => setSupplierSelected(e.target.checked)} />
            <span>供应商</span>
          </label>
        </div>
        <UdsInput label="联系人" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        <UdsInput label="电话" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <UdsInput label="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <UdsInput label="地址" value={address} onChange={(e) => setAddress(e.target.value)} />
        <UdsInput label="备注" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <div className="flex justify-end gap-2">
          {onCancel ? <UdsButton type="button" variant="ghost" onClick={onCancel}>取消</UdsButton> : null}
          <UdsButton type="submit" disabled={isSubmitting}>保存</UdsButton>
        </div>
      </form>
    </UdsCard>
  );
};
```

```tsx
// frontend/src/components/counterparties/CounterpartyPicker.tsx
import React from 'react';
import { UdsSelect } from '../uds/UdsComponents';
import type { Counterparty } from '../../types';
import { buildCounterpartyOptionLabel } from './counterpartyUtils';

interface CounterpartyPickerProps {
  label: string;
  value: string;
  counterparties: Counterparty[];
  onChange: (value: string) => void;
}

export const CounterpartyPicker: React.FC<CounterpartyPickerProps> = ({ label, value, counterparties, onChange }) => {
  return (
    <UdsSelect
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      options={[
        { value: '', label: '请选择往来主体' },
        ...counterparties.map((counterparty) => ({
          value: counterparty.id,
          label: buildCounterpartyOptionLabel(counterparty),
        })),
      ]}
    />
  );
};
```

```tsx
// frontend/src/components/counterparties/CounterpartyLedgerModal.tsx
import React from 'react';
import { UdsBadge, UdsButton, UdsCard } from '../uds/UdsComponents';
import type { CounterpartyLedger } from '../../types';
import { getCounterpartyRoleLabels } from './counterpartyUtils';

interface CounterpartyLedgerModalProps {
  isOpen: boolean;
  ledger: CounterpartyLedger | null;
  onClose: () => void;
}

export const CounterpartyLedgerModal: React.FC<CounterpartyLedgerModalProps> = ({ isOpen, ledger, onClose }) => {
  if (!isOpen || !ledger) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl">
        <UdsCard
          title={`往来主体台账 · ${ledger.counterparty.name}`}
          action={<UdsButton type="button" variant="ghost" onClick={onClose}>关闭</UdsButton>}
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {getCounterpartyRoleLabels(ledger.counterparty.roleType).map((label) => (
              <UdsBadge key={label}>{label}</UdsBadge>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>应收总额: {ledger.receivable.total}</div>
            <div>应付总额: {ledger.payable.total}</div>
            <div>净头寸: {ledger.netPosition}</div>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div>财务单据数: {ledger.bills.length}</div>
            <div>销售单数: {ledger.salesOrders.length}</div>
            <div>采购单数: {ledger.purchaseOrders.length}</div>
          </div>
        </UdsCard>
      </div>
    </div>
  );
};
```

Also add translation keys for:

- `counterpartyLabel`
- `counterpartyCustomerLabel`
- `counterpartySupplierLabel`
- `counterpartyLedgerTitle`
- `counterpartyPickerPlaceholder`
- `netPosition`

- [ ] **Step 4: Run frontend tests and build after shared UI creation**

Run:

```bash
node --experimental-strip-types --test tests/financeArapUtils.test.ts tests/counterpartyUtils.test.ts
npm run build
```

Expected: the tests pass and the new shared counterparty components compile.

- [ ] **Step 5: Commit the shared counterparty UI**

```bash
git add frontend/src/components/counterparties/CounterpartyForm.tsx frontend/src/components/counterparties/CounterpartyPicker.tsx frontend/src/components/counterparties/CounterpartyLedgerModal.tsx frontend/src/components/counterparties/counterpartyUtils.ts frontend/src/i18n/translations.ts frontend/tests/counterpartyUtils.test.ts
git commit -m "feat: add shared counterparty ui"
```

## Task 7: Reconnect Sales, Procurement, After-Sales, and Batch Order Forms

**Files:**
- Modify: `frontend/src/pages/SalesManagement.tsx`
- Modify: `frontend/src/pages/ProcurementManagement.tsx`
- Modify: `frontend/src/pages/AfterSalesManagement.tsx`
- Modify: `frontend/src/components/uds/SalesOrderForm.tsx`
- Modify: `frontend/src/components/uds/PurchaseOrderForm.tsx`
- Modify: `frontend/src/components/afterSales/AfterSalesCaseModal.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Run the frontend build to expose remaining `customerId` and `supplierId` call sites**

Run: `npm run build`

Expected: FAIL with references to `customerId`, `supplierId`, `customer`, `supplier`, or `globalSearchResult.customers`.

- [ ] **Step 2: Replace page-level and batch-form usage with counterparty-aware props**

```tsx
// frontend/src/pages/SalesManagement.tsx
const { customers, isLoading: custLoading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
const [isCounterpartyFormOpen, setIsCounterpartyFormOpen] = useState(false);
const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

const payload = {
  counterpartyId: orderCounterpartyId,
  itemId: orderItemId,
  qty: qtyVal,
  price: priceVal,
  currencyId: orderCurrencyId,
  status: orderStatus,
};

<CounterpartyForm
  title={editingCustomer ? '编辑客户往来主体' : '新建客户往来主体'}
  initialValue={editingCustomer}
  defaultRole="customer"
  onSubmit={async (counterpartyPayload) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, counterpartyPayload);
    } else {
      await createCustomer(counterpartyPayload);
    }
    setIsCounterpartyFormOpen(false);
  }}
  onCancel={() => setIsCounterpartyFormOpen(false)}
/>;
```

```tsx
// frontend/src/components/uds/SalesOrderForm.tsx
const [itemsList, setItemsList] = useState<Array<{
  counterpartyId: string;
  itemId: string;
  qty: number;
  price: number;
  currencyId: string;
  status: 'DRAFT' | 'ACTIVE' | 'SHIPPED';
}>>([]);
```

```tsx
// frontend/src/pages/ProcurementManagement.tsx
const payload = {
  counterpartyId: orderCounterpartyId,
  itemId: orderItemId,
  qty: qtyInt,
  price: priceFloat,
  currencyId: orderCurrencyId,
  status: orderStatus,
  expectedDate: orderExpectedDate || null,
};
```

```tsx
// frontend/src/components/uds/PurchaseOrderForm.tsx
const [itemsList, setItemsList] = useState<Array<{
  counterpartyId: string;
  itemId: string;
  qty: number;
  price: number;
  currencyId: string;
  expectedDate: string;
}>>([]);
```

```tsx
// frontend/src/components/afterSales/AfterSalesCaseModal.tsx
interface AfterSalesCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterparties: Customer[];
  items: Item[];
  initialCase: AfterSalesCase | null;
  onSubmit: (values: {
    counterpartyId: string;
    shipFromAddress: string;
    itemId: string;
    warehouseId: string;
    qty: string;
    shipmentTrackingNumber: string;
    type: 'REPAIR' | 'RETURN' | 'EXCHANGE';
    processedDate: string;
    shipBackAddress: string;
    note: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';
  }) => Promise<void>;
  showToast: ShowToast;
  warehouses: Warehouse[];
}
```

```tsx
// frontend/src/App.tsx
{globalSearchResult?.counterparties.length ? (
  <div>
    <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
      往来主体
    </div>
    {globalSearchResult.counterparties.map((counterparty) => (
      <button
        key={counterparty.id}
        type="button"
        onClick={() => {
          navigate(counterparty.roleType === 'SUPPLIER' ? '/procurement' : '/sales');
          setIsSearchModalOpen(false);
        }}
      >
        <span className="font-semibold mr-2">{counterparty.name}</span>
        <span className="text-[10px] text-neutral-500">{counterparty.code}</span>
      </button>
    ))}
  </div>
) : null}
```

- [ ] **Step 3: Rebuild the frontend after the page and form migration**

Run: `npm run build`

Expected: PASS with sales, procurement, after-sales, batch forms, and global search now using `counterpartyId`.

- [ ] **Step 4: Commit the page and batch-form migration**

```bash
git add frontend/src/pages/SalesManagement.tsx frontend/src/pages/ProcurementManagement.tsx frontend/src/pages/AfterSalesManagement.tsx frontend/src/components/uds/SalesOrderForm.tsx frontend/src/components/uds/PurchaseOrderForm.tsx frontend/src/components/afterSales/AfterSalesCaseModal.tsx frontend/src/App.tsx
git commit -m "feat: reconnect sales procurement and after-sales to counterparties"
```

## Task 8: Finish Finance Counterparty Search, Ledger Modal, and Final Verification

**Files:**
- Modify: `frontend/src/pages/FinanceARAP.tsx`
- Modify: `frontend/src/pages/financeArapUtils.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Run the frontend build to expose remaining finance references to `partner`**

Run: `npm run build`

Expected: FAIL with `formPartner`, `bill.partner`, or finance payload code that still sends `partner`.

- [ ] **Step 2: Replace finance free-text partner usage with the counterparty picker and ledger modal**

```tsx
const { counterparties, loadLedger } = useCounterparties('both');
const [selectedCounterpartyId, setSelectedCounterpartyId] = useState('');
const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
const [activeLedger, setActiveLedger] = useState<CounterpartyLedger | null>(null);

const handleOpenLedger = async (counterpartyId: string) => {
  const ledger = await loadLedger(counterpartyId);
  setActiveLedger(ledger);
  setLedgerModalOpen(true);
};

await createBill({
  type: formType,
  amount: parseFloat(formAmount),
  counterpartyId: selectedCounterpartyId,
  description: formDescription.trim() || null,
  dueDate: formDueDate,
  currencyId: formCurrencyId,
});
```

```tsx
<CounterpartyPicker
  label={t('partnerCol')}
  value={selectedCounterpartyId}
  counterparties={counterparties}
  onChange={setSelectedCounterpartyId}
/>;

<CounterpartyLedgerModal
  isOpen={ledgerModalOpen}
  ledger={activeLedger}
  onClose={() => setLedgerModalOpen(false)}
/>;
```

```tsx
<span className="font-semibold text-neutral-200">{bill.counterpartyNameSnapshot}</span>
```

Also update `frontend/src/pages/financeArapUtils.ts` so it reads the updated `FinancialBill` type cleanly without any dependency on the removed `partner` field.

- [ ] **Step 3: Run the full automated verification suite**

Run:

```bash
# backend
cd backend
node --import tsx --test tests/counterpartyRules.test.ts tests/counterpartyPrisma.test.ts tests/counterpartyLedger.test.ts tests/counterpartyDocuments.test.ts
npm run build

# frontend
cd ../frontend
node --experimental-strip-types --test tests/financeArapUtils.test.ts tests/counterpartyUtils.test.ts
npm run build
```

Expected:

- backend tests PASS
- backend build PASS
- frontend tests PASS
- frontend build PASS

- [ ] **Step 4: Run a manual smoke test with both dev servers**

Run:

```bash
# from repo root
npm run dev
```

Manual checks:

1. Create one counterparty with both customer and supplier checked.
2. Create a sales order using that counterparty.
3. Create a purchase order using that same counterparty.
4. Create a manual finance bill against that same counterparty.
5. Open the finance counterparty ledger modal and confirm AR, AP, net position, and linked order lists all appear together.
6. Create or edit an after-sales case using that same counterparty.
7. Search that counterparty from the global search box and confirm the result opens the correct workflow.

- [ ] **Step 5: Commit the finance completion pass**

```bash
git add frontend/src/pages/FinanceARAP.tsx frontend/src/pages/financeArapUtils.ts frontend/src/services/api.ts
git commit -m "feat: finish finance counterparty search and ledger"
```

## Spec Coverage Check

- Single unified `Counterparty` table:
  - Covered by Task 2 schema and migration work.
- One `roleType` field with `CUSTOMER`, `SUPPLIER`, `BOTH`:
  - Covered by Task 1 helper conversion and Task 2 persistence conversion.
- Duplicate prevention through `name` and `normalizedName`:
  - Covered by Task 2 schema constraints and Task 3 create and update route validation.
- Shared create and edit flow:
  - Covered by Task 6 shared UI components and Task 7 page rewiring.
- Sales, procurement, finance, and after-sales all use `counterpartyId`:
  - Covered by Task 4 backend route conversion and Task 7 plus Task 8 frontend conversion.
- Finance snapshot and source metadata:
  - Covered by Task 3 finance-document helpers and Task 4 finance route conversion.
- Counterparty ledger modal:
  - Covered by Task 3 ledger endpoint and Task 8 finance modal wiring.
- New project with no legacy merge workflow:
  - Preserved by the plan because the migration only converts the current local schema from booleans to `roleType` and does not add dedupe or merge logic.

## Planning Notes

- Do not revert the in-progress rebuild already present in `frontend/src/pages/FinanceARAP.tsx`, `frontend/src/pages/financeArapUtils.ts`, or `frontend/src/App.tsx`. Build on top of those edits.
- Keep `useCustomers` and `useSuppliers` as wrappers in the first pass so the page migration stays small and reviewable.
- Use `counterparties.routes.ts` for master-data CRUD instead of keeping parallel `/customers` and `/suppliers` master-data endpoints alive indefinitely.
- Counterparty read access must allow finance users, not only sales and procurement users. That is why the route layer needs `canReadCounterparties` instead of a single `requirePermission('canAccessSales')`.
- For SQLite, keep `roleType` as a string literal field rather than introducing a Prisma enum unless the generated migration proves clean in this repository.
