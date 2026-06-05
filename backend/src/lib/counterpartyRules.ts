export type CounterpartyRole = 'customer' | 'supplier';
export type CounterpartyRoleType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
export type CounterpartyCapability = CounterpartyRole;

export type CounterpartyRoleState = {
  isCustomer: boolean;
  isSupplier: boolean;
};

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

export function assertCounterpartyRoleType(
  roleType: string,
): asserts roleType is CounterpartyRoleType {
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

export function deriveCounterpartyRoleType(
  state: CounterpartyRoleState,
): CounterpartyRoleType {
  if (state.isCustomer && state.isSupplier) return 'BOTH';
  if (state.isCustomer) return 'CUSTOMER';
  if (state.isSupplier) return 'SUPPLIER';
  throw new Error('At least one counterparty role must be enabled.');
}

export function assertCounterpartyRoles(state: CounterpartyRoleState): void {
  deriveCounterpartyRoleType(state);
}

export function allowsCounterpartyRole(
  state: CounterpartyRoleState,
  role: CounterpartyRole,
): boolean {
  return allowsCounterpartyCapability(deriveCounterpartyRoleType(state), role);
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
  return Boolean(
    role.protected ||
      role.canAccessSales ||
      role.canAccessPurchase ||
      role.canAccessAfterSales,
  );
}
