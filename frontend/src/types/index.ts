// ==========================================
// 共享类型定义 - 全局数据模型
// ==========================================

// --- 用户与权限 ---
export interface Role {
  id: string;
  name: string;
  protected: boolean;
  canAccessUsers: boolean;
  canAccessWarehouse: boolean;
  canAccessProducts: boolean;
  canAccessGoods: boolean;
  canAccessFinance: boolean;
  canAccessSales: boolean;
  canAccessPurchase: boolean;
  canAccessAssembly: boolean;
  canViewCost: boolean;
  canViewSalesPrice: boolean;
}

export interface User {
  id: string;
  username: string;
  roleId: string;
  role: Role;
}

export interface UserPermission {
  username: string;
  roleName: string;
  canAccessUsers: boolean;
  canAccessWarehouse: boolean;
  canAccessProducts: boolean;
  canAccessGoods: boolean;
  canAccessFinance: boolean;
  canAccessSales: boolean;
  canAccessPurchase: boolean;
  canAccessAssembly: boolean;
  canViewCost: boolean;
  canViewSalesPrice: boolean;
}

// --- 仓库 ---
export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
}

// --- 物料 / 产品 ---
export interface Item {
  id: string;
  code: string;
  name: string;
  unit: string;
  description?: string | null;
  cost: number;
  type?: string;
  currencyId?: string;
  currency?: Currency;
}

// --- 货物流转 ---
export interface GoodsMove {
  id: string;
  itemId: string;
  item: Item;
  qty: number;
  type: 'IN' | 'OUT' | 'TRANSFER';
  fromWarehouseId: string | null;
  toWarehouseId: string | null;
  fromWarehouse: Warehouse | null;
  toWarehouse: Warehouse | null;
  remarks: string | null;
  userId: string;
  user: { username: string };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  usernameSnapshot: string | null;
  roleIdSnapshot: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  durationMs: number | null;
  meta?: Record<string, any> | null;
  createdAt: string;
}

export interface StockMatrixRow {
  itemCode: string;
  itemName: string;
  unit: string;
  warehouseStocks: Record<string, number>;
  totalStock: number;
}

// --- 财务 ---
export interface FinancialBill {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: number;
  currencyId?: string;
  currency?: Currency;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  partner: string;
  description: string | null;
  dueDate: string;
  createdAt: string;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  type: 'IN' | 'OUT';
  amount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface PaymentAccount {
  id: string;
  name: string;
  type: string;
  accountNo: string;
  holder: string | null;
  balance: number;
  currencyId: string;
  currency?: Currency;
  transactions?: AccountTransaction[];
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

// --- 供应商 ---
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
}

// --- 客户 ---
export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

// --- 采购订单 ---
export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplier: Supplier;
  itemId: string;
  item: Item;
  qty: number;
  price: number;
  totalPrice: number;
  currencyId?: string;
  currency?: Currency;
  status: 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CLOSED';
  expectedDate: string | null;
  receivedQty: number;
  orderDate: string;
  createdAt: string;
}

// --- 销售订单 ---
export interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customer: Customer;
  itemId: string;
  item: Item;
  qty: number;
  price: number;
  totalPrice: number;
  currencyId?: string;
  currency?: Currency;
  status: 'DRAFT' | 'ACTIVE' | 'SHIPPED' | 'CLOSED';
  orderDate: string;
}

// --- 通用 ---
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export type ShowToast = (message: string, type: 'success' | 'error') => void;
