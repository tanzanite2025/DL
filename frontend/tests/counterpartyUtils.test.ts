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
    '[CP-0007] Northwind - 客户/供应商',
  );
});

test('picker labels and role badges keep customer before supplier for BOTH', () => {
  assert.deepEqual(getCounterpartyRoleLabels('BOTH'), ['客户', '供应商']);
  assert.equal(
    buildCounterpartyOptionLabel({ code: 'CP-0008', name: 'Dual Corp', roleType: 'BOTH' }),
    '[CP-0008] Dual Corp - 客户/供应商',
  );
});
