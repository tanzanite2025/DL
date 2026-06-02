import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { Users, Trash2, Edit3, TruckIcon } from 'lucide-react';
import { Supplier, PurchaseOrder, ShowToast } from '../types';
import { useSuppliers } from '../hooks/useSuppliers';
import { useItems } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { usePurchaseOrders } from '../hooks/usePurchaseOrders';

interface ProcurementManagementProps {
  token: string;
  showToast: ShowToast;
}

export const ProcurementManagement: React.FC<ProcurementManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');
  const { suppliers, isLoading: suppliersLoading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { items, isLoading: itemsLoading } = useItems();
  const { warehouses, isLoading: whLoading } = useWarehouses();
  const { orders: purchaseOrders, isLoading: ordersLoading, createOrder, updateOrder, deleteOrder, receiveOrder } = usePurchaseOrders();
  const isLoading = suppliersLoading || itemsLoading || whLoading || ordersLoading;

  // 供应商表单状态
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierRemarks, setSupplierRemarks] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  // 采购订单表单状态
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderItemId, setOrderItemId] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderExpectedDate, setOrderExpectedDate] = useState('');
  const [orderStatus, setOrderStatus] = useState<'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CLOSED'>('DRAFT');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // 收货表单状态
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');

  // 数据加载后设置默认表单值
  React.useEffect(() => {
    if (suppliers.length > 0 && !orderSupplierId) setOrderSupplierId(suppliers[0].id);
    if (items.length > 0 && !orderItemId) setOrderItemId(items[0].id);
    if (warehouses.length > 0 && !receiveWarehouseId) setReceiveWarehouseId(warehouses[0].id);
  }, [suppliers, items, warehouses]);

  // ==================== 供应商管理函数 ====================
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast(t('errSupplierFormRequired'), 'error');
      return;
    }

    const payload = {
      name: supplierName.trim(),
      contactPerson: contactPerson.trim() || null,
      phone: supplierPhone.trim() || null,
      email: supplierEmail.trim() || null,
      address: supplierAddress.trim() || null,
      remarks: supplierRemarks.trim() || null,
    };

    try {
      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, payload);
      } else {
        await createSupplier(payload);
      }

      showToast(
        editingSupplierId ? t('supplierUpdatedSuccess') : t('supplierCreatedSuccess'),
        'success'
      );
      clearSupplierForm();
    } catch (error: any) {
      showToast(error.message || t('errSupplierFormRequired'), 'error');
    }
  };

  const clearSupplierForm = () => {
    setSupplierName('');
    setContactPerson('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setSupplierRemarks('');
    setEditingSupplierId(null);
  };

  const startEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierName(supplier.name);
    setContactPerson(supplier.contactPerson || '');
    setSupplierPhone(supplier.phone || '');
    setSupplierEmail(supplier.email || '');
    setSupplierAddress(supplier.address || '');
    setSupplierRemarks(supplier.remarks || '');
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm(t('supplierDeleteConfirm'))) {
      return;
    }

    try {
      await deleteSupplier(id);
      showToast(t('supplierDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('supplierDeletedSuccess'), 'error');
    }
  };

  // ==================== 采购订单管理函数 ====================
  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyInt = parseInt(orderQty);
    const priceFloat = parseFloat(orderPrice);

    if (!orderSupplierId || !orderItemId || isNaN(qtyInt) || isNaN(priceFloat)) {
      showToast(t('errPurchaseFormRequired'), 'error');
      return;
    }

    if (qtyInt <= 0 || priceFloat < 0) {
      showToast(t('errPurchaseFormRequired'), 'error');
      return;
    }

    const payload = {
      supplierId: orderSupplierId,
      itemId: orderItemId,
      qty: qtyInt,
      price: priceFloat,
      status: orderStatus,
      expectedDate: orderExpectedDate || null,
    };

    try {
      if (editingOrderId) {
        await updateOrder(editingOrderId, payload);
      } else {
        await createOrder(payload);
      }

      showToast(
        editingOrderId ? t('orderUpdatedSuccess') : t('orderCreatedSuccess'),
        'success'
      );
      clearOrderForm();
    } catch (error: any) {
      showToast(error.message || t('errPurchaseFormRequired'), 'error');
    }
  };

  const clearOrderForm = () => {
    setOrderQty('');
    setOrderPrice('');
    setOrderExpectedDate('');
    setOrderStatus('DRAFT');
    setEditingOrderId(null);
    if (suppliers.length > 0) setOrderSupplierId(suppliers[0].id);
    if (items.length > 0) setOrderItemId(items[0].id);
  };

  const startEditOrder = (order: PurchaseOrder) => {
    setEditingOrderId(order.id);
    setOrderSupplierId(order.supplierId);
    setOrderItemId(order.itemId);
    setOrderQty(order.qty.toString());
    setOrderPrice(order.price.toString());
    setOrderStatus(order.status);
    setOrderExpectedDate(order.expectedDate ? order.expectedDate.split('T')[0] : '');
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm(t('orderDeleteConfirm'))) {
      return;
    }

    try {
      await deleteOrder(id);
      showToast(t('orderDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('orderDeletedSuccess'), 'error');
    }
  };

  // ==================== 收货登记函数 ====================
  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingOrderId) return;

    const qtyInt = parseInt(receiveQty);
    if (isNaN(qtyInt) || qtyInt <= 0) {
      showToast(t('errReceiveQtyInvalid'), 'error');
      return;
    }

    const order = purchaseOrders.find(o => o.id === receivingOrderId);
    if (!order) return;

    const remainingQty = order.qty - order.receivedQty;
    if (qtyInt > remainingQty) {
      showToast(t('errReceiveQtyInvalid'), 'error');
      return;
    }

    try {
      await receiveOrder(receivingOrderId, { receiveQty: qtyInt, warehouseId: receiveWarehouseId });
      showToast(t('goodsReceivedSuccess'), 'success');
      setReceivingOrderId(null);
      setReceiveQty('');
    } catch (error: any) {
      showToast(error.message || t('goodsReceivedSuccess'), 'error');
    }
  };

  const startReceiving = (order: PurchaseOrder) => {
    setReceivingOrderId(order.id);
    const remainingQty = order.qty - order.receivedQty;
    setReceiveQty(remainingQty.toString());
  };

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">
          {t('loading')}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* 页眉 - 已隐藏（保留代码便于定位） */}
      <UdsHeader
        className="hidden"
        title={t('procurementHeader')}
        description={t('procurementDesc')}
      />

      {/* TAB 切换 */}
      <div className="flex bg-[#121214] p-1.5 rounded-2xl border border-dashed border-white/5 self-start gap-2">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'suppliers'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('suppliersTab')}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'orders'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('purchaseOrdersTab')}
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        // ==================== 供应商管理 TAB ====================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧：供应商表单 */}
          <div className="lg:col-span-5">
            <UdsCard
              title={editingSupplierId ? t('editSupplier') : t('registerSupplier')}
              action={
                editingSupplierId && (
                  <UdsButton variant="ghost" onClick={clearSupplierForm} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              <form onSubmit={handleSaveSupplier} className="flex flex-col gap-4">
                <UdsInput
                  label={t('supplierName')}
                  placeholder={t('supplierNamePlaceholder')}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  required
                />
                <UdsInput
                  label={t('contactPerson')}
                  placeholder={t('contactPersonPlaceholder')}
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <UdsInput
                    label={t('supplierPhone')}
                    placeholder={t('supplierPhone')}
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                  />
                  <UdsInput
                    label={t('supplierEmail')}
                    type="email"
                    placeholder={t('supplierEmail')}
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                  />
                </div>
                <UdsInput
                  label={t('supplierAddress')}
                  placeholder={t('supplierAddressPlaceholder')}
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                />
                <UdsInput
                  label={t('supplierRemarks')}
                  placeholder={t('supplierRemarksPlaceholder')}
                  value={supplierRemarks}
                  onChange={(e) => setSupplierRemarks(e.target.value)}
                />
                <div className="border-t border-dashed border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full">
                    {editingSupplierId ? t('saveChanges') : t('registerSupplier')}
                  </UdsButton>
                </div>
              </form>
            </UdsCard>
          </div>

          {/* 右侧：供应商列表 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('supplierList')}>
              <div className="flex flex-col gap-4">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl border border-dashed border-white/5 bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-dashed border-white/10 shrink-0 mt-1">
                        <Users size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">{supplier.name}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">{supplier.code}</p>
                        {supplier.contactPerson && (
                          <p className="text-[9px] text-neutral-500 mt-1">{t('contactPerson')}: {supplier.contactPerson}</p>
                        )}
                        {supplier.phone && (
                          <p className="text-[9px] text-neutral-500">{t('supplierPhone')}: {supplier.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                        onClick={() => startEditSupplier(supplier)}
                      >
                        <Edit3 size={12} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDeleteSupplier(supplier.id)}
                      >
                        <Trash2 size={12} />
                      </UdsButton>
                    </div>
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <span className="text-[10px] font-mono text-neutral-600 text-center py-4 block">
                    {t('noSuppliersRegistered')}
                  </span>
                )}
              </div>
            </UdsCard>
          </div>
        </div>
      ) : (
        // ==================== 采购订单 TAB ====================
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧：订单表单 */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <UdsCard
              title={editingOrderId ? t('editPurchaseOrder') : t('createPurchaseOrder')}
              action={
                editingOrderId && (
                  <UdsButton variant="ghost" onClick={clearOrderForm} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              {suppliers.length === 0 || items.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center">
                  {suppliers.length === 0 ? t('noSuppliersAvailable') : t('noItemsAvailable')}
                </div>
              ) : (
                <form onSubmit={handleSavePurchaseOrder} className="flex flex-col gap-4">
                  <UdsSelect
                    label={t('selectSupplier')}
                    options={suppliers.map(s => ({ value: s.id, label: `[${s.code}] ${s.name}` }))}
                    value={orderSupplierId}
                    onChange={(e) => setOrderSupplierId(e.target.value)}
                  />
                  <UdsSelect
                    label={t('selectItem')}
                    options={items.map(it => ({ value: it.id, label: `[${it.code}] ${it.name} (${it.unit})` }))}
                    value={orderItemId}
                    onChange={(e) => setOrderItemId(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <UdsInput
                      label={t('purchaseQty')}
                      type="number"
                      min="1"
                      placeholder={t('purchaseQty')}
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      required
                    />
                    <UdsInput
                      label={t('purchasePrice')}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={t('purchasePrice')}
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      required
                    />
                  </div>
                  <UdsInput
                    label={t('expectedDeliveryDate')}
                    type="date"
                    value={orderExpectedDate}
                    onChange={(e) => setOrderExpectedDate(e.target.value)}
                  />
                  <UdsSelect
                    label={t('orderStatus')}
                    options={[
                      { value: 'DRAFT', label: t('statusDraft') },
                      { value: 'CONFIRMED', label: t('statusConfirmed') },
                    ]}
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                  />
                  <div className="border-t border-dashed border-white/5 pt-4">
                    <UdsButton type="submit" variant="primary" className="w-full">
                      {editingOrderId ? t('saveChanges') : t('createPurchaseOrder')}
                    </UdsButton>
                  </div>
                </form>
              )}
            </UdsCard>

            {/* 收货登记卡片 */}
            {receivingOrderId && (() => {
              const order = purchaseOrders.find(o => o.id === receivingOrderId);
              if (!order) return null;
              const remainingQty = order.qty - order.receivedQty;
              return (
                <UdsCard
                  title={t('receiveGoodsTitle')}
                  action={
                    <UdsButton variant="ghost" onClick={() => { setReceivingOrderId(null); setReceiveQty(''); }} className="h-7 px-3">
                      {t('cancel')}
                    </UdsButton>
                  }
                  className="border-neutral-500 bg-neutral-900/60"
                >
                  <form onSubmit={handleReceiveGoods} className="flex flex-col gap-4">
                    <div className="text-[10px] text-neutral-400 font-mono flex flex-col gap-1.5 p-3 rounded-2xl bg-black/30 border border-dashed border-white/5 mb-2">
                      <div>{t('orderNo')}: <span className="text-white font-bold">{order.orderNo}</span></div>
                      <div>{t('selectSupplier')}: <span className="text-white font-bold">{order.supplier.name}</span></div>
                      <div>{t('selectItem')}: <span className="text-white font-bold">{order.item.name}</span></div>
                      <div>{t('purchaseQty')}: <span className="text-white font-bold">{order.qty} {order.item.unit}</span></div>
                      <div>{t('receivedQty')}: <span className="text-emerald-500 font-bold">{order.receivedQty} {order.item.unit}</span></div>
                      <div>{t('pendingQty')}: <span className="text-amber-500 font-bold">{remainingQty} {order.item.unit}</span></div>
                    </div>
                    {warehouses.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center">
                        {t('noWarehousesAvailable')}
                      </div>
                    ) : (
                      <>
                        <UdsInput
                          label={t('receiveQtyLabel')}
                          type="number"
                          min="1"
                          max={remainingQty}
                          placeholder={`Max: ${remainingQty}`}
                          value={receiveQty}
                          onChange={(e) => setReceiveQty(e.target.value)}
                          required
                        />
                        <UdsSelect
                          label={t('targetWarehouse')}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          value={receiveWarehouseId}
                          onChange={(e) => setReceiveWarehouseId(e.target.value)}
                        />
                        <UdsButton type="submit" variant="primary" className="w-full">
                          {t('registerReceiving')}
                        </UdsButton>
                      </>
                    )}
                  </form>
                </UdsCard>
              );
            })()}
          </div>

          {/* 右侧：采购订单列表 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('purchaseOrderList')}>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-dashed border-white/10">
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                        {t('orderNo')}
                      </th>
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                        {t('selectSupplier')}
                      </th>
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                        {t('selectItem')}
                      </th>
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                        {t('orderStatus')}
                      </th>
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                        {t('qtyCol')}
                      </th>
                      <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                        {t('actionsColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-dashed border-white/5 hover:bg-white/2 transition-all text-xs"
                      >
                        <td className="py-3.5 pl-2">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-neutral-200">{order.orderNo}</span>
                            <span className="text-[8px] font-mono text-neutral-500">
                              {new Date(order.orderDate).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="text-neutral-300">{order.supplier.name}</span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-200">{order.item.name}</span>
                            <span className="text-[8px] font-mono text-neutral-500">{order.item.code}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-center">
                          {order.status === 'DRAFT' && (
                            <UdsBadge status="default">{t('statusDraft')}</UdsBadge>
                          )}
                          {order.status === 'CONFIRMED' && (
                            <UdsBadge status="alert">{t('statusConfirmed')}</UdsBadge>
                          )}
                          {order.status === 'RECEIVED' && (
                            <UdsBadge status="healthy">{t('statusReceived')}</UdsBadge>
                          )}
                          {order.status === 'CLOSED' && (
                            <UdsBadge status="critical">{t('statusClosed')}</UdsBadge>
                          )}
                        </td>
                        <td className="py-3.5 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span className="text-neutral-200 font-semibold">{order.qty} {order.item.unit}</span>
                            {order.receivedQty > 0 && (
                              <span className="text-[9px] text-emerald-500">✓ {order.receivedQty}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status !== 'RECEIVED' && order.status !== 'CLOSED' && order.receivedQty < order.qty && (
                              <UdsButton
                                variant="ghost"
                                className="h-7 px-2.5 rounded-full text-[9px] !font-bold"
                                onClick={() => startReceiving(order)}
                              >
                                <TruckIcon size={10} className="mr-0.5" /> {t('receiveGoods')}
                              </UdsButton>
                            )}
                            <UdsButton
                              variant="ghost"
                              className="h-7 w-7 !p-0 rounded-full border-none text-neutral-400 hover:text-white"
                              onClick={() => startEditOrder(order)}
                            >
                              <Edit3 size={11} />
                            </UdsButton>
                            <UdsButton
                              variant="ghost"
                              className="h-7 w-7 !p-0 rounded-full border-none text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 size={11} />
                            </UdsButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {purchaseOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                          {t('noPurchaseOrders')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </UdsCard>
          </div>
        </div>
      )}
    </div>
  );
};
