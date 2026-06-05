import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  allowsCounterpartyCapability,
  assertCounterpartyRoleType,
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
