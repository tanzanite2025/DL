import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  allowsCounterpartyRole,
  assertCounterpartyRoles,
  buildNextCounterpartyCode,
  canManageCounterparties,
  canReadCounterparties,
  normalizeCounterpartyName,
} from '../src/lib/counterpartyRules.js';

test('normalizeCounterpartyName trims, collapses spaces, and uppercases latin text', () => {
  assert.equal(normalizeCounterpartyName('  Acme   Corp  '), 'ACME CORP');
  assert.equal(normalizeCounterpartyName('  北京   acme  ltd  '), '北京 ACME LTD');
});

test('buildNextCounterpartyCode increments the highest CP code', () => {
  assert.equal(
    buildNextCounterpartyCode(['CP-0003', 'CP-0010', 'INV-9', 'CP-0007']),
    'CP-0011',
  );
  assert.equal(buildNextCounterpartyCode([]), 'CP-0001');
});

test('assertCounterpartyRoles rejects records without any enabled role', () => {
  assert.throws(() => assertCounterpartyRoles({ isCustomer: false, isSupplier: false }));
  assert.doesNotThrow(() => assertCounterpartyRoles({ isCustomer: true, isSupplier: false }));
});

test('allowsCounterpartyRole checks requested business flow', () => {
  const customerOnly = { isCustomer: true, isSupplier: false };
  const supplierOnly = { isCustomer: false, isSupplier: true };
  const both = { isCustomer: true, isSupplier: true };

  assert.equal(allowsCounterpartyRole(customerOnly, 'customer'), true);
  assert.equal(allowsCounterpartyRole(customerOnly, 'supplier'), false);
  assert.equal(allowsCounterpartyRole(supplierOnly, 'supplier'), true);
  assert.equal(allowsCounterpartyRole(supplierOnly, 'customer'), false);
  assert.equal(allowsCounterpartyRole(both, 'customer'), true);
  assert.equal(allowsCounterpartyRole(both, 'supplier'), true);
});

test('canReadCounterparties and canManageCounterparties follow permission access rules', () => {
  assert.equal(
    canReadCounterparties({ protected: true, canAccessSales: false, canAccessPurchase: false, canAccessAfterSales: false, canAccessFinance: false }),
    true,
  );
  assert.equal(
    canReadCounterparties({ canAccessSales: false, canAccessPurchase: false, canAccessAfterSales: false, canAccessFinance: true }),
    true,
  );
  assert.equal(
    canReadCounterparties({ canAccessSales: false, canAccessPurchase: false, canAccessAfterSales: false, canAccessFinance: false }),
    false,
  );

  assert.equal(
    canManageCounterparties({ protected: true, canAccessSales: false, canAccessPurchase: false, canAccessAfterSales: false, canAccessFinance: false }),
    true,
  );
  assert.equal(
    canManageCounterparties({ canAccessSales: false, canAccessPurchase: true, canAccessAfterSales: false, canAccessFinance: true }),
    true,
  );
  assert.equal(
    canManageCounterparties({ canAccessSales: false, canAccessPurchase: false, canAccessAfterSales: false, canAccessFinance: true }),
    false,
  );
});
