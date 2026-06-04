// ==========================================
// API 统一封装层 - Token 注入 + 错误处理
// ==========================================

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('dalang_erp_token');
}

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `请求失败 (${res.status})`);
  }

  return res.json();
}

// --- Auth ---
export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string; userId: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () =>
    request<{ username: string; role: any }>('/auth/me'),
};

// --- Users ---
export const usersApi = {
  list: () => request<any[]>('/users'),
  create: (data: { username: string; password: string; roleId: string }) =>
    request('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { roleId: string; password?: string }) =>
    request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/users/${id}`, { method: 'DELETE' }),
};

// --- Roles ---
export const rolesApi = {
  list: () => request<any[]>('/roles'),
  create: (name: string) =>
    request('/roles', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, data: Record<string, any>) =>
    request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/roles/${id}`, { method: 'DELETE' }),
};

// --- Warehouses ---
export const warehousesApi = {
  list: () => request<any[]>('/warehouses'),
  create: (data: { name: string; location?: string; description?: string }) =>
    request('/warehouses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name: string; location?: string; description?: string }) =>
    request(`/warehouses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/warehouses/${id}`, { method: 'DELETE' }),
};

// --- Items ---
export const itemsApi = {
  list: () => request<any[]>('/items'),
  create: (data: { name: string; unit?: string; description?: string; cost?: number; currencyId?: string; type?: string }) =>
    request('/items', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { code: string; name: string; unit: string; description?: string; cost?: number; currencyId?: string; type?: string }) =>
    request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/items/${id}`, { method: 'DELETE' }),
};

// --- Goods Moves ---
export const goodsMovesApi = {
  list: () => request<any[]>('/goods-moves'),
  create: (data: any) =>
    request('/goods-moves', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/goods-moves/${id}`, { method: 'DELETE' }),
};

// --- Units ---
export const unitsApi = {
  list: () => request<any[]>('/units'),
  create: (data: { code: string; name: string }) =>
    request('/units', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { code: string; name: string }) =>
    request(`/units/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/units/${id}`, { method: 'DELETE' }),
};

// --- Audit Logs ---
export const auditApi = {
  list: (params: { userId?: string; resource?: string; action?: string; skip?: number; take?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.userId) search.set('userId', params.userId);
    if (params.resource) search.set('resource', params.resource);
    if (params.action) search.set('action', params.action);
    if (params.skip !== undefined) search.set('skip', String(params.skip));
    if (params.take !== undefined) search.set('take', String(params.take));
    const qs = search.toString();
    return request<{ total: number; records: any[] }>(`/audit${qs ? `?${qs}` : ''}`);
  },
};

// --- Finance ---
export const financeApi = {
  listBills: () => request<any[]>('/finance'),
  createBill: (data: any) =>
    request('/finance', { method: 'POST', body: JSON.stringify(data) }),
  payBill: (id: string, data: { payAmount: number; accountId?: string }) =>
    request(`/finance/${id}/pay`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBill: (id: string) =>
    request(`/finance/${id}`, { method: 'DELETE' }),
};

// --- Payment Accounts ---
export const paymentAccountsApi = {
  list: () => request<any[]>('/payment-accounts'),
  create: (data: any) =>
    request('/payment-accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/payment-accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/payment-accounts/${id}`, { method: 'DELETE' }),
};

// --- Currencies ---
export const currenciesApi = {
  list: () => request<any[]>('/currencies'),
  create: (data: { code: string; name: string; symbol: string; isDefault?: boolean }) =>
    request('/currencies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { code: string; name: string; symbol: string; isDefault?: boolean }) =>
    request(`/currencies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/currencies/${id}`, { method: 'DELETE' }),
};

// --- Suppliers ---
export const suppliersApi = {
  list: () => request<any[]>('/suppliers'),
  create: (data: any) =>
    request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/suppliers/${id}`, { method: 'DELETE' }),
};

// --- Purchase Orders ---
export const purchaseOrdersApi = {
  list: () => request<any[]>('/purchase-orders'),
  create: (data: any) =>
    request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/purchase-orders/${id}`, { method: 'DELETE' }),
  receive: (id: string, data: { receiveQty: number; warehouseId: string }) =>
    request(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
};

// --- Customers ---
export const customersApi = {
  list: () => request<any[]>('/customers'),
  create: (data: any) =>
    request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/customers/${id}`, { method: 'DELETE' }),
};

// --- Sales Orders ---
export const salesOrdersApi = {
  list: () => request<any[]>('/sales-orders'),
  create: (data: any) =>
    request('/sales-orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/sales-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/sales-orders/${id}`, { method: 'DELETE' }),
  createBill: (id: string) =>
    request(`/sales-orders/${id}/create-bill`, { method: 'POST' }),
};

// --- After Sales ---
export const afterSalesApi = {
  list: () => request<any[]>('/after-sales'),
  create: (data: any) =>
    request('/after-sales', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/after-sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/after-sales/${id}`, { method: 'DELETE' }),
};

// --- Assembly ---
export const assemblyApi = {
  check: (data: { assembledItemId: string; quantity: number; warehouseId: string }) =>
    request('/assembly/check', { method: 'POST', body: JSON.stringify(data) }),
  assemble: (data: { assembledItemId: string; quantity: number; warehouseId: string; remarks?: string }) =>
    request('/assembly/assemble', { method: 'POST', body: JSON.stringify(data) }),
  disassemble: (data: { assembledItemId: string; quantity: number; warehouseId: string; remarks?: string }) =>
    request('/assembly/disassemble', { method: 'POST', body: JSON.stringify(data) }),
  listLogs: () => request<any[]>('/assembly/logs'),
};

// --- BOM ---
export const bomApi = {
  list: () => request<any[]>('/bom'),
  getByItemId: (itemId: string) => request<any[]>(`/bom/${itemId}`),
  save: (data: { parentItemId: string; components: any[] }) =>
    request('/bom', { method: 'POST', body: JSON.stringify(data) }),
  deleteComponent: (parentId: string, componentId: string) =>
    request(`/bom/${parentId}/${componentId}`, { method: 'DELETE' }),
};
