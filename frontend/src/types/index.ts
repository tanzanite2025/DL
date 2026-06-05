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
  canAccessAfterSales: boolean;
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
   canAccessAfterSales: boolean;
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

export interface LedgerSummary {
  total: number;
  paid: number;
  pending: number;
}

export interface CounterpartyLedger {
  counterparty: Pick<Counterparty, 'id' | 'code' | 'name' | 'roleType' | 'isActive'>;
  receivable: LedgerSummary;
  payable: LedgerSummary;
  netPosition: number;
  bills: Array<{
    id: string;
    type: 'RECEIVABLE' | 'PAYABLE';
    amount: number;
    paidAmount: number;
  }>;
  salesOrders: Array<{ id: string; orderNo: string }>;
  purchaseOrders: Array<{ id: string; orderNo: string }>;
}

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
  sourceType?: 'MANUAL' | 'SALES_ORDER' | 'PURCHASE_ORDER';
  sourceId?: string | null;
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

// --- 客户 ---

// --- 采购订单 ---
export interface PurchaseOrder {
  id: string;
  orderNo: string;
  counterpartyId: string;
  counterparty: Counterparty;
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
  counterpartyId: string;
  counterparty: Counterparty;
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

// --- 售后单 ---
export interface AfterSalesCase {
  id: string;
  receivedDate: string;
  counterpartyId: string;
  counterparty: Counterparty;
  customerAddressSnapshot: string | null;
  itemId: string;
  item: Item;
  qty: number;
  salesOrderId: string | null;
  salesOrder?: SalesOrder | null;
  warehouseId: string | null;
  warehouse?: Warehouse | null;
  shipmentTrackingNumber: string | null;
  goodsMoveId: string | null;
  goodsMove?: GoodsMove | null;
  type: 'REPAIR' | 'RETURN' | 'EXCHANGE';
  processedDate: string | null;
  shipBackAddress: string | null;
  note: string | null;
  handlerId: string | null;
  handlerName?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

// 全局搜索结果聚合结构
export interface GlobalSearchResult {
  query: string;
  counterparties: Counterparty[];
  items: Item[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  afterSalesCases: AfterSalesCase[];
  warehouses: Warehouse[];
}

// --- 通用 ---
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export type ShowToast = (message: string, type: 'success' | 'error') => void;
