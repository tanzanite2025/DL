import type { Counterparty, CounterpartyRoleType } from '../../types';

export function buildRoleTypeFromSelection(
  customerSelected: boolean,
  supplierSelected: boolean,
): CounterpartyRoleType {
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

export function buildCounterpartyOptionLabel(
  counterparty: Pick<Counterparty, 'code' | 'name' | 'roleType'>,
): string {
  const roleLabel = getCounterpartyRoleLabels(counterparty.roleType).join('/');
  return `[${counterparty.code}] ${counterparty.name} - ${roleLabel}`;
}
