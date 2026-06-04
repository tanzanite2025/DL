export type CounterpartyRole = 'customer' | 'supplier';

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

export function assertCounterpartyRoles(state: CounterpartyRoleState): void {
  if (!state.isCustomer && !state.isSupplier) {
    throw new Error('At least one counterparty role must be enabled.');
  }
}

export function allowsCounterpartyRole(
  state: CounterpartyRoleState,
  role: CounterpartyRole,
): boolean {
  return role === 'customer' ? state.isCustomer : state.isSupplier;
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
