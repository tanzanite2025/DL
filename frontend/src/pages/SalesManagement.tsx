import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge } from '../components/uds/UdsComponents';
import { SalesOrderForm } from '../components/uds/SalesOrderForm';
import { useI18n } from '../i18n/I18nContext';
import { Trash2, Edit3, CircleDollarSign } from 'lucide-react';
import { Customer, SalesOrder, ShowToast } from '../types';
import { useCustomers } from '../hooks/useCustomers';
import { useItems } from '../hooks/useItems';
import { useSalesOrders } from '../hooks/useSalesOrders';

interface SalesManagementProps {
  token: string;
  showToast: ShowToast;
}

export const SalesManagement: React.FC<SalesManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>('orders');
  const { customers, isLoading: custLoading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { items, isLoading: itemsLoading } = useItems();
  const { orders, isLoading: ordersLoading, createOrder, updateOrder, deleteOrder, createBillFromOrder } = useSalesOrders();
  const isLoading = custLoading || itemsLoading || ordersLoading;

  // 客户表单状态
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // 订单表单状态
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderItemId, setOrderItemId] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderStatus, setOrderStatus] = useState<'DRAFT' | 'ACTIVE' | 'SHIPPED'>('DRAFT');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // 数据加载后设置默认表单值
  React.useEffect(() => {
    if (customers.length > 0 && !orderCustomerId) setOrderCustomerId(customers[0].id);
    if (items.length > 0 && !orderItemId) setOrderItemId(items[0].id);
  }, [customers, items]);

  // 1. 保存/更新客户信息
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast(t('errCustomerNameRequired'), 'error');
      return;
    }

    const payload = {
      name: customerName.trim(),
      phone: customerPhone.trim() || null,
      email: customerEmail.trim() || null,
      address: customerAddress.trim() || null
    };

    try {
      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, payload);
      } else {
        await createCustomer(payload);
      }

      showToast(
        editingCustomerId ? t('customerUpdatedSuccess') : t('customerCreatedSuccess'),
        'success'
      );

      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setEditingCustomerId(null);
    } catch (error: any) {
      showToast(error.message || '保存客户出错', 'error');
    }
  };

  // 编辑客户
  const startEditCustomer = (c: Customer) => {
    setEditingCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setCustomerAddress(c.address || '');
  };

  // 取消编辑客户
  const cancelEditCustomer = () => {
    setEditingCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
  };

  // 删除客户
  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm(t('customerDeleteConfirm'))) {
      return;
    }

    try {
      await deleteCustomer(id);
      showToast(t('customerDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || '删除客户失败', 'error');
    }
  };

  // 2. 保存/更新销售订单
  const handleBatchSaveOrders = async (ordersList: any[]) => {
    try {
      for (const item of ordersList) {
        await createOrder({
          customerId: item.customerId,
          itemId: item.itemId,
          qty: item.qty,
          price: item.price,
          status: item.status
        });
      }
      showToast(t('orderCreatedSuccess') || '批量销售订单创建成功', 'success');
      setIsOrderModalOpen(false);
    } catch (error: any) {
      showToast(error.message || '批量保存出错', 'error');
    }
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCustomerId || !orderItemId || !orderQty || !orderPrice) {
      showToast(t('errOrderFieldsRequired'), 'error');
      return;
    }

    const qtyVal = parseInt(orderQty);
    const priceVal = parseFloat(orderPrice);

    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast(t('errOrderQtyPositive'), 'error');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      showToast(t('errOrderPricePositive'), 'error');
      return;
    }

    const payload = {
      customerId: orderCustomerId,
      itemId: orderItemId,
      qty: qtyVal,
      price: priceVal,
      status: orderStatus
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

      setOrderQty('');
      setOrderPrice('');
      setOrderStatus('DRAFT');
      setEditingOrderId(null);
    } catch (error: any) {
      showToast(error.message || '保存订单出错', 'error');
    }
  };

  // 编辑订单
  const startEditOrder = (o: SalesOrder) => {
    if (o.status === 'CLOSED') {
      showToast(t('errOrderClosedNoEdit'), 'error');
      return;
    }
    setEditingOrderId(o.id);
    setOrderCustomerId(o.customerId);
    setOrderItemId(o.itemId);
    setOrderQty(o.qty.toString());
    setOrderPrice(o.price.toString());
    setOrderStatus(o.status as 'DRAFT' | 'ACTIVE' | 'SHIPPED');
  };

  // 取消编辑订单
  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setOrderQty('');
    setOrderPrice('');
    setOrderStatus('DRAFT');
    if (customers.length > 0) setOrderCustomerId(customers[0].id);
    if (items.length > 0) setOrderItemId(items[0].id);
  };

  // 删除订单
  const handleDeleteOrder = async (o: SalesOrder) => {
    if (o.status === 'CLOSED') {
      showToast(t('errOrderClosedNoEdit'), 'error');
      return;
    }

    if (!window.confirm(t('orderDeleteConfirm'))) {
      return;
    }

    try {
      await deleteOrder(o.id);
      showToast(t('orderDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || '作废订单失败', 'error');
    }
  };

  // 一键同步/生成财务账单 (带乐观 UI)
  const handleCreateBillFromOrder = async (orderId: string) => {
    try {
      await createBillFromOrder(orderId);
      showToast(t('orderBillCreatedSuccess'), 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || '一键同步财务失败', 'error');
    }
  };

  // 实时计算预计总货款
  const calculatedTotal = React.useMemo(() => {
    const q = parseInt(orderQty);
    const p = parseFloat(orderPrice);
    if (isNaN(q) || isNaN(p) || q <= 0 || p < 0) return 0;
    return q * p;
  }, [orderQty, orderPrice]);

  if (isLoading && customers.length === 0 && orders.length === 0) {
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
        title={t('salesHeader')}
        description={t('salesDesc')}
      />

      {/* 模块子 Tab 切换（无边框暗色药丸胶囊） */}
      <div className="flex bg-black/40 p-1 rounded-full w-fit gap-1 self-start select-none">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'orders' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {t('orderTab')}
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'customers' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {t('customerTab')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {activeTab === 'customers' ? (
          <>
            {/* 客户管理：左侧登记表单 */}
            <div className="lg:col-span-4">
              <UdsCard title={editingCustomerId ? t('editProduct') : t('registerCustomer')}>
                <form onSubmit={handleSaveCustomer} className="flex flex-col gap-5">
                  <UdsInput
                    label={t('customerName')}
                    placeholder={t('customerNamePlaceholder')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                  <UdsInput
                    label={t('customerPhone')}
                    placeholder={t('customerPhonePlaceholder')}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <UdsInput
                    label={t('customerEmail')}
                    placeholder={t('customerEmailPlaceholder')}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                  <UdsInput
                    label={t('customerAddress')}
                    placeholder={t('customerAddressPlaceholder')}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />

                  <div className="flex gap-3 mt-2">
                    <UdsButton type="submit" variant="primary" className="flex-1">
                      {editingCustomerId ? t('save') : t('registerCustomerBtn')}
                    </UdsButton>
                    {editingCustomerId && (
                      <UdsButton type="button" variant="secondary" onClick={cancelEditCustomer}>
                        {t('cancel')}
                      </UdsButton>
                    )}
                  </div>
                </form>
              </UdsCard>
            </div>

            {/* 客户管理：右侧列表表格 */}
            <div className="lg:col-span-8">
              <UdsCard title={t('customerList')}>
                {customers.length === 0 ? (
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest py-8 text-center">
                    {t('noCustomers')}
                  </p>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-solid border-white/10">
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2 w-16">
                            {t('customerCodeCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('customerNameCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('customerPhoneCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('customerEmailCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('customerAddressCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                            {t('actionsColumn')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b border-solid border-white/5 hover:bg-white/2 transition-all"
                          >
                            <td className="py-3.5 pl-2 font-mono text-[9px] text-neutral-400">
                              {c.code}
                            </td>
                            <td className="py-3.5 pl-2">
                              <span className="text-sm font-bold text-neutral-200">{c.name}</span>
                            </td>
                            <td className="py-3.5 pl-2 text-xs text-neutral-300 font-medium">
                              {c.phone || '---'}
                            </td>
                            <td className="py-3.5 pl-2 text-xs text-neutral-400">
                              {c.email || '---'}
                            </td>
                            <td className="py-3.5 pl-2 text-xs text-neutral-400 max-w-[180px] truncate" title={c.address || ''}>
                              {c.address || '---'}
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <div className="flex justify-end gap-1.5">
                                <UdsButton
                                  variant="ghost"
                                  className="h-8 w-8 !p-0 rounded-full text-neutral-400 hover:text-white border-none"
                                  onClick={() => startEditCustomer(c)}
                                >
                                  <Edit3 size={12} />
                                </UdsButton>
                                <UdsButton
                                  variant="ghost"
                                  className="h-8 w-8 !p-0 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-none"
                                  onClick={() => handleDeleteCustomer(c.id)}
                                >
                                  <Trash2 size={12} />
                                </UdsButton>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </UdsCard>
            </div>
          </>
        ) : (
          <>
            {/* 销售订单：左侧表单仅在编辑时显示 */}
            {editingOrderId && (
              <div className="lg:col-span-4 flex flex-col gap-8">
                <UdsCard title={t('editProduct') || '编辑销售订单'}>
                <form onSubmit={handleSaveOrder} className="flex flex-col gap-5">
                  <UdsSelect
                    label={t('orderCustomerCol')}
                    options={customers.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                    value={orderCustomerId}
                    onChange={(e) => setOrderCustomerId(e.target.value)}
                    required
                  />
                  {customers.length === 0 && (
                    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider pl-1">
                      * 请先在客户 Tab 登记客户数据
                    </span>
                  )}

                  <UdsSelect
                    label={t('orderItemCol')}
                    options={items.map(it => ({ value: it.id, label: `${it.code} - ${it.name} (${it.unit})` }))}
                    value={orderItemId}
                    onChange={(e) => setOrderItemId(e.target.value)}
                    required
                  />
                  {items.length === 0 && (
                    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider pl-1">
                      * 请先在产品管理中登记产品物料
                    </span>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <UdsInput
                      label={t('orderQtyCol')}
                      type="number"
                      placeholder={t('qtyPlaceholder')}
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      required
                    />
                    <UdsInput
                      label={t('orderPriceCol')}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={orderPrice}
                      onChange={(e) => setOrderPrice(e.target.value)}
                      required
                    />
                  </div>

                  <UdsSelect
                    label={t('orderStatusCol')}
                    options={[
                      { value: 'DRAFT', label: t('salesStatusDraft') },
                      { value: 'ACTIVE', label: t('salesStatusActive') },
                      { value: 'SHIPPED', label: t('salesStatusShipped') }
                    ]}
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                    required
                  />

                  {/* 预计总货款展示 */}
                  <div className="bg-[#1c1c1e]/40 p-4 rounded-2xl flex flex-col gap-1 mt-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 block">
                      {t('estimatedTotal')}
                    </span>
                    <span className="text-xl font-black italic tracking-tighter text-white font-mono">
                      ¥ {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <UdsButton type="submit" variant="primary" className="flex-1" disabled={customers.length === 0 || items.length === 0}>
                      {editingOrderId ? t('save') : t('createOrderBtn')}
                    </UdsButton>
                    {editingOrderId && (
                      <UdsButton type="button" variant="secondary" onClick={cancelEditOrder}>
                        {t('cancel')}
                      </UdsButton>
                    )}
                  </div>
                </form>
              </UdsCard>
            </div>
            )}

            {/* 销售订单：右侧表格总账 */}
            <div className={editingOrderId ? "lg:col-span-8" : "lg:col-span-12"}>
              <UdsCard
                title={t('salesOrderList')}
                action={
                  !editingOrderId && (
                    <UdsButton
                      variant="primary"
                      className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setIsOrderModalOpen(true)}
                    >
                      {t('salesOrderTitle') || '新建销售订单'}
                    </UdsButton>
                  )
                }
              >
                {orders.length === 0 ? (
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest py-8 text-center">
                    {t('noSalesOrders')}
                  </p>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-solid border-white/10">
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2 w-16">
                            {t('orderNoCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('orderCustomerCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('orderItemCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                            {t('orderQtyCol')}/{t('orderPriceCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                            {t('orderTotalCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center w-20">
                            {t('orderStatusCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center w-24">
                            {t('orderDateCol')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                            {t('actionsColumn')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          let badgeStatus: 'default' | 'healthy' | 'alert' | 'critical' = 'default';
                          let statusText = '';
                          if (o.status === 'DRAFT') {
                            badgeStatus = 'default';
                            statusText = t('salesStatusDraft');
                          } else if (o.status === 'ACTIVE') {
                            badgeStatus = 'healthy';
                            statusText = t('salesStatusActive');
                          } else if (o.status === 'SHIPPED') {
                            badgeStatus = 'alert';
                            statusText = t('salesStatusShipped');
                          } else if (o.status === 'CLOSED') {
                            badgeStatus = 'healthy'; // 结案状态
                            statusText = t('salesStatusClosed');
                          }

                          return (
                            <tr
                              key={o.id}
                              className="border-b border-solid border-white/5 hover:bg-white/2 transition-all"
                            >
                              <td className="py-3.5 pl-2 font-mono text-[9px] text-neutral-400">
                                {o.orderNo}
                              </td>
                              <td className="py-3.5 pl-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-neutral-200">{o.customer?.name}</span>
                                  <span className="text-[8px] font-mono text-neutral-500 tracking-wider">[{o.customer?.code}]</span>
                                </div>
                              </td>
                              <td className="py-3.5 pl-2">
                                <div className="flex flex-col">
                                  <span className="text-xs text-neutral-300 font-semibold">{o.item?.name}</span>
                                  <span className="text-[8px] font-mono text-neutral-500 tracking-wider">[{o.item?.code}]</span>
                                </div>
                              </td>
                              <td className="py-3.5 text-center text-xs text-neutral-300 font-mono">
                                {o.qty} {o.item?.unit} x ¥{o.price.toFixed(2)}
                              </td>
                              <td className="py-3.5 text-right font-bold text-sm text-neutral-200 font-mono">
                                ¥{o.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 text-center">
                                <UdsBadge status={badgeStatus}>{statusText}</UdsBadge>
                              </td>
                              <td className="py-3.5 text-center font-mono text-[9px] text-neutral-500">
                                {new Date(o.orderDate).toLocaleDateString(undefined, {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3.5 text-right pr-2">
                                <div className="flex justify-end gap-1.5 items-center">
                                  {o.status !== 'CLOSED' && (
                                    <>
                                      {/* 一键生成财务账单 */}
                                      <UdsButton
                                        variant="ghost"
                                        className="h-8 !px-3 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-none flex items-center gap-1 shrink-0"
                                        onClick={() => handleCreateBillFromOrder(o.id)}
                                        title={t('orderCreateBillBtn')}
                                      >
                                        <CircleDollarSign size={11} />
                                        <span className="text-[8px] font-black uppercase tracking-wider">{t('orderCreateBillBtn')}</span>
                                      </UdsButton>

                                      <UdsButton
                                        variant="ghost"
                                        className="h-8 w-8 !p-0 rounded-full text-neutral-400 hover:text-white border-none"
                                        onClick={() => startEditOrder(o)}
                                      >
                                        <Edit3 size={12} />
                                      </UdsButton>
                                    </>
                                  )}
                                  
                                  {o.status !== 'CLOSED' && (
                                    <UdsButton
                                      variant="ghost"
                                      className="h-8 w-8 !p-0 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border-none"
                                      onClick={() => handleDeleteOrder(o)}
                                    >
                                      <Trash2 size={12} />
                                    </UdsButton>
                                  )}

                                  {o.status === 'CLOSED' && (
                                    <span className="text-[8px] font-mono font-bold text-neutral-600 uppercase tracking-widest px-2.5">
                                      {t('salesStatusClosed')}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </UdsCard>
            </div>
          </>
        )}
      </div>

      {/* 新建销售订单 Modal 弹窗 */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full w-[85vw] max-w-7xl h-[80vh] flex flex-col animate-uds-fade">
            <SalesOrderForm
              className="h-full flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden"
              showToast={showToast}
              onSuccess={handleBatchSaveOrders}
              action={
                <button
                  onClick={() => setIsOrderModalOpen(false)}
                  className="text-neutral-400 hover:text-white shrink-0 cursor-pointer p-1.5 rounded-full hover:bg-white/5 transition-all text-xs"
                >
                  {t('cancel') || '取消'}
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
