import React, { useState, useEffect } from 'react';
import { UdsCard, UdsButton, UdsInput, UdsSelect } from './UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useCurrencies } from '../../hooks/useCurrencies';
import { useItems } from '../../hooks/useItems';
import { Item, ShowToast } from '../../types';

interface PurchaseOrderFormProps {
  showToast: ShowToast;
  onSuccess?: (ordersPayload: any[]) => void;
  title?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  showToast,
  onSuccess,
  title,
  action,
  className = ''
}) => {
  const { t } = useI18n();
  const { items, fetchItems } = useItems();
  const { suppliers, fetchSuppliers } = useSuppliers();
  const { currencies, fetchCurrencies } = useCurrencies();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 待提交采购明细清单
  const [itemsList, setItemsList] = useState<Array<{
    counterpartyId: string;
    itemId: string;
    qty: number;
    price: number;
    currencyId: string;
    expectedDate: string;
  }>>([]);

  // 快速录入网格状态（默认5行）
  const [quickRows, setQuickRows] = useState<Array<{
    counterpartyId: string;
    itemId: string;
    qty: string;
    price: string;
    currencyId: string;
    expectedDate: string;
  }>>(
    Array.from({ length: 5 }, () => ({ counterpartyId: '', itemId: '', qty: '', price: '', currencyId: '', expectedDate: '' }))
  );

  useEffect(() => {
    fetchItems();
    fetchSuppliers();
    fetchCurrencies();
  }, [fetchItems, fetchSuppliers, fetchCurrencies]);

  const handleQuickRowChange = (index: number, field: string, value: string) => {
    setQuickRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddQuickRow = () => {
    setQuickRows((prev) => [...prev, { counterpartyId: '', itemId: '', qty: '', price: '', currencyId: '', expectedDate: '' }]);
  };

  const handleAddQuickRows = () => {
    const validRows = quickRows.filter((row) => {
      const qtyInt = parseInt(row.qty);
      const priceFloat = parseFloat(row.price);
      return row.counterpartyId && row.itemId && row.currencyId && !isNaN(qtyInt) && qtyInt > 0 && !isNaN(priceFloat) && priceFloat >= 0;
    });

    if (validRows.length === 0) {
      if (quickRows.every(r => !r.counterpartyId && !r.itemId && !r.qty && !r.price)) {
        showToast(t('errPurchaseNoItems') || '待提交明细不能为空', 'error');
      }
      return;
    }

    const newItems = validRows.map(r => ({
      counterpartyId: r.counterpartyId,
      itemId: r.itemId,
      qty: parseInt(r.qty),
      price: parseFloat(r.price),
      currencyId: r.currencyId,
      expectedDate: r.expectedDate
    }));

    setItemsList((prev) => [...prev, ...newItems]);
    
    // 清空有效行
    setQuickRows(prev => prev.map(row => {
      if (validRows.some(vr => vr.itemId === row.itemId && vr.counterpartyId === row.counterpartyId && vr.qty === row.qty)) {
        return { counterpartyId: '', itemId: '', qty: '', price: '', currencyId: '', expectedDate: '' };
      }
      return row;
    }));
  };

  const handleRemoveListItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (itemsList.length === 0) {
      showToast(t('errPurchaseNoItems') || '待提交明细不能为空', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSuccess) {
        // 交由上层（ProcurementManagement）处理顺序串行提交
        await onSuccess(itemsList);
      }
      setItemsList([]);
    } catch (error: any) {
      showToast(error.message || t('errMovementFailed') || '执行失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent = items.length > 0 && suppliers.length > 0;

  return (
    <UdsCard
      title={title || t('purchaseOrderTitle') || '新建采购订单'}
      className={className}
      action={action}
    >
      {!hasContent ? (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm border border-dashed border-white/10 rounded-2xl bg-black/20">
          {items.length === 0 ? (t('noItemsAvailable') || '缺少物料') : (t('noSuppliersAvailable') || '缺少供应商')}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* 左侧：多行快速录入网格 */}
          <div className="flex-1 border border-dashed border-white/10 rounded-2xl bg-black/20 p-4 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none rounded-t-2xl" />
            <h3 className="text-sm font-black tracking-tighter italic uppercase text-neutral-200 z-10 flex items-center gap-2">
              {t('addPurchaseDetail') || '添加采购明细'}
              <span className="text-[10px] font-mono text-neutral-500 not-italic ml-2 opacity-50">
                BATCH ENTRY
              </span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-900/90 backdrop-blur z-20">
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 pl-2">
                      {t('purchaseSupplierCol') || '供应商'}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2">
                      {t('itemCol') || '物料'}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 w-20">
                      {t('qtyCol') || '数量'}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 w-24">
                      {t('purchasePriceCol') || '单价'}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 w-20">
                      币种
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 w-32 pr-2">
                      {t('purchaseDateCol') || '到货日期'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quickRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-solid border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-1.5 pl-1 pr-1">
                        <UdsSelect
                          className="h-8 text-xs !bg-transparent border-transparent hover:border-white/10"
                          value={row.counterpartyId}
                          onChange={(e) => handleQuickRowChange(idx, 'counterpartyId', e.target.value)}
                          options={[
                            { value: '', label: '--' },
                            ...suppliers.map(s => ({ value: s.id, label: s.name }))
                          ]}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <UdsSelect
                          className="h-8 text-xs !bg-transparent border-transparent hover:border-white/10"
                          value={row.itemId}
                          onChange={(e) => handleQuickRowChange(idx, 'itemId', e.target.value)}
                          options={[
                            { value: '', label: '-- 选择采购物料 --' },
                            ...[...items]
                              .sort((a, b) => {
                                if (a.type !== 'PRODUCT' && b.type === 'PRODUCT') return -1;
                                if (a.type === 'PRODUCT' && b.type !== 'PRODUCT') return 1;
                                return 0;
                              })
                              .map(it => ({ 
                                value: it.id, 
                                label: `${it.type === 'PRODUCT' ? '📦[成品]' : '🧩[原料]'} ${it.name} (${it.code})` 
                              }))
                          ]}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <UdsInput
                          type="number"
                          min="1"
                          className="h-8 text-xs font-mono !bg-transparent border-transparent hover:border-white/10 px-2"
                          placeholder="0"
                          value={row.qty}
                          onChange={(e) => handleQuickRowChange(idx, 'qty', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <UdsInput
                          type="number"
                          min="0"
                          step="0.01"
                          className="h-8 text-xs font-mono !bg-transparent border-transparent hover:border-white/10 px-2"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => handleQuickRowChange(idx, 'price', e.target.value)}
                        />
                      </td>
                      <td className="py-1.5 px-1">
                        <UdsSelect
                          className="h-8 text-xs font-mono !bg-transparent border-transparent hover:border-white/10 px-1"
                          value={row.currencyId}
                          onChange={(e) => handleQuickRowChange(idx, 'currencyId', e.target.value)}
                          options={[
                            { value: '', label: '--' },
                            ...currencies.map(c => ({ value: c.id, label: c.symbol }))
                          ]}
                        />
                      </td>
                      <td className="py-1.5 pl-1 pr-1">
                        <UdsInput
                          type="date"
                          className="h-8 text-xs font-mono !bg-transparent border-transparent hover:border-white/10 px-2"
                          value={row.expectedDate}
                          onChange={(e) => handleQuickRowChange(idx, 'expectedDate', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center z-10 pt-2 border-t border-dashed border-white/10">
              <UdsButton
                variant="ghost"
                type="button"
                className="h-8 text-[10px] font-black uppercase"
                onClick={handleAddQuickRow}
              >
                + {t('addInputRow') || '添加录入行'}
              </UdsButton>
              <UdsButton
                variant="primary"
                type="button"
                className="h-9 text-[10px] font-black uppercase tracking-widest px-6"
                onClick={handleAddQuickRows}
              >
                {t('stageOrdersToList') || '移入待提交清单'} &rarr;
              </UdsButton>
            </div>
          </div>

          {/* 右侧：待提交清单 */}
          <div className="w-full lg:w-[35%] flex flex-col gap-4 border border-dashed border-white/10 rounded-2xl bg-black/10 p-4">
            <h3 className="text-sm font-black tracking-tighter italic uppercase text-neutral-200">
              {t('purchaseItemsList') || '待提交明细'}
              <span className="text-[10px] ml-2 text-primary font-mono">{itemsList.length}</span>
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {itemsList.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                  EMPTY LIST
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {itemsList.map((itemObj, idx) => {
                    const it = items.find((i: Item) => i.id === itemObj.itemId);
                    const sup = suppliers.find(s => s.id === itemObj.counterpartyId);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-white/5 rounded-xl p-3 border border-solid border-white/5 group">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-neutral-200">{it?.name || 'Unknown'}</span>
                          <span className="text-[9px] font-mono text-neutral-500 mt-0.5">{sup?.name || 'Unknown'}</span>
                          <div className="text-[9px] font-mono text-neutral-400 mt-1 flex gap-2">
                            <span>x {itemObj.qty}</span>
                            <span>@ {currencies.find(c => c.id === itemObj.currencyId)?.symbol}{itemObj.price}</span>
                            {itemObj.expectedDate && <span>({itemObj.expectedDate})</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-[9px] font-black uppercase text-rose-500/50 hover:text-rose-500 transition-colors px-2 py-1"
                          onClick={() => handleRemoveListItem(idx)}
                        >
                          {t('remove') || '移除'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-dashed border-white/10">
              <UdsButton
                variant="primary"
                className="w-full h-11 text-[10px] font-black uppercase tracking-widest"
                onClick={handleSubmit}
                disabled={itemsList.length === 0 || isSubmitting}
              >
                {isSubmitting ? (t('transacting') || '执行中...') : (t('batchSaveOrders') || '批量保存订单')}
              </UdsButton>
            </div>
          </div>
        </div>
      )}
    </UdsCard>
  );
};
