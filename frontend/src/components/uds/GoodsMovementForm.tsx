import React, { useState, useEffect } from 'react';
import { UdsCard, UdsButton, UdsInput, UdsSelect } from './UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import { useItems } from '../../hooks/useItems';
import { useWarehouses } from '../../hooks/useWarehouses';
import { useGoodsMoves } from '../../hooks/useGoodsMoves';
import { ShowToast } from '../../types';

interface GoodsMovementFormProps {
  showToast: ShowToast;
  onSuccess?: () => void;
  
  // 预设及限制 Props
  initialType?: 'IN' | 'OUT' | 'TRANSFER';
  initialItemId?: string;
  initialQty?: string;
  maxQty?: number; // 最大流转数量限制
  initialFromWarehouseId?: string;
  initialToWarehouseId?: string;
  initialRemarks?: string;
  
  // 锁定字段（不可编辑）
  lockType?: boolean;
  lockItem?: boolean;
  lockFromWarehouse?: boolean;
  lockToWarehouse?: boolean;
  
  // 自定义提交函数
  onSubmit?: (data: {
    itemId: string;
    qty: number;
    type: 'IN' | 'OUT' | 'TRANSFER';
    fromWarehouseId: string | null;
    toWarehouseId: string | null;
    remarks: string;
  }) => Promise<void>;

  title?: string;
  action?: React.ReactNode; // 附加在 UdsCard 顶栏的操作按钮（如取消）
  className?: string;
}

export const GoodsMovementForm: React.FC<GoodsMovementFormProps> = ({
  showToast,
  onSuccess,
  initialType = 'IN',
  initialItemId = '',
  initialQty = '',
  maxQty,
  initialFromWarehouseId = '',
  initialToWarehouseId = '',
  initialRemarks = '',
  lockType = false,
  lockItem = false,
  lockFromWarehouse = false,
  lockToWarehouse = false,
  onSubmit,
  title,
  action,
  className = ''
}) => {
  const { t } = useI18n();
  const { items, fetchItems } = useItems();
  const { warehouses, fetchWarehouses } = useWarehouses();
  const { createMove } = useGoodsMoves();

  // 表单状态
  const [formItemId, setFormItemId] = useState(initialItemId);
  const [formQty, setFormQty] = useState(initialQty);
  const [formType, setFormType] = useState<'IN' | 'OUT' | 'TRANSFER'>(initialType);
  const [formFromWhId, setFormFromWhId] = useState(initialFromWarehouseId);
  const [formToWhId, setFormToWhId] = useState(initialToWarehouseId);
  const [formRemarks, setFormRemarks] = useState(initialRemarks);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 待提交物料明细列表
  const [itemsList, setItemsList] = useState<Array<{ itemId: string; qty: number }>>([]);

  // 快速录入网格状态（默认5行）
  const [quickRows, setQuickRows] = useState<Array<{ itemId: string; qty: string }>>(
    Array.from({ length: 5 }, () => ({ itemId: '', qty: '' }))
  );

  const handleQuickRowChange = (index: number, field: 'itemId' | 'qty', value: string) => {
    setQuickRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddQuickRow = () => {
    setQuickRows((prev) => [...prev, { itemId: '', qty: '' }]);
  };

  const handleAddQuickRows = () => {
    const validRows = quickRows.filter((row) => {
      const qtyInt = parseInt(row.qty);
      return row.itemId && !isNaN(qtyInt) && qtyInt > 0;
    });

    if (validRows.length === 0) {
      showToast(t('errMovementNoItems') || '请至少填写一行有效的物料和数量', 'error');
      return;
    }

    setItemsList((prev) => {
      const next = [...prev];
      validRows.forEach((row) => {
        const qtyInt = parseInt(row.qty);
        const idx = next.findIndex((item) => item.itemId === row.itemId);
        if (idx > -1) {
          next[idx] = { ...next[idx], qty: next[idx].qty + qtyInt };
        } else {
          next.push({ itemId: row.itemId, qty: qtyInt });
        }
      });
      return next;
    });

    // 重置快速录入网格
    setQuickRows(Array.from({ length: 5 }, () => ({ itemId: '', qty: '' })));
  };

  // 初始化拉取物料和仓库数据，并做默认选中
  useEffect(() => {
    fetchItems();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (items.length > 0 && !formItemId) {
      setFormItemId(items[0].id);
    }
  }, [items, formItemId]);

  useEffect(() => {
    if (warehouses.length > 0) {
      if (!formFromWhId) setFormFromWhId(warehouses[0].id);
      if (!formToWhId) setFormToWhId(warehouses[0].id);
    }
  }, [warehouses, formFromWhId, formToWhId]);

  // 当外部传入的预设变化时同步
  useEffect(() => {
    if (initialItemId) setFormItemId(initialItemId);
  }, [initialItemId]);

  useEffect(() => {
    if (initialQty) setFormQty(initialQty);
  }, [initialQty]);

  useEffect(() => {
    if (initialFromWarehouseId) setFormFromWhId(initialFromWarehouseId);
  }, [initialFromWarehouseId]);

  useEffect(() => {
    if (initialToWarehouseId) setFormToWhId(initialToWarehouseId);
  }, [initialToWarehouseId]);

  useEffect(() => {
    if (initialRemarks) setFormRemarks(initialRemarks);
  }, [initialRemarks]);

  const handleRemoveItem = (index: number) => {
    setItemsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockItem) {
      // 锁定单物料模式（如采购订单收货）
      const qtyInt = parseInt(formQty);

      if (!formItemId || isNaN(qtyInt) || qtyInt <= 0) {
        showToast(t('errMovementFormInvalid'), 'error');
        return;
      }

      if (maxQty && qtyInt > maxQty) {
        showToast(`${t('errReceiveQtyInvalid') || '数量超出限制'} (Max: ${maxQty})`, 'error');
        return;
      }

      if (formType === 'OUT' && !formFromWhId) {
        showToast(t('errOutboundNoFromWh'), 'error');
        return;
      }
      if (formType === 'IN' && !formToWhId) {
        showToast(t('errInboundNoToWh'), 'error');
        return;
      }
      if (formType === 'TRANSFER' && (!formFromWhId || !formToWhId)) {
        showToast(t('errTransferNoWh'), 'error');
        return;
      }
      if (formType === 'TRANSFER' && formFromWhId === formToWhId) {
        showToast(t('errTransferSameWh'), 'error');
        return;
      }

      setIsSubmitting(true);
      const data = {
        itemId: formItemId,
        qty: qtyInt,
        type: formType,
        fromWarehouseId: formType === 'IN' ? null : formFromWhId,
        toWarehouseId: formType === 'OUT' ? null : formToWhId,
        remarks: formRemarks,
      };

      try {
        if (onSubmit) {
          await onSubmit(data);
        } else {
          await createMove(data);
          showToast(t('movementSuccess'), 'success');
          setFormQty('');
          setFormRemarks('');
        }
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        showToast(error.message || t('errMovementFailed'), 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // 批量录入模式
      if (itemsList.length === 0) {
        showToast(t('errMovementNoItems'), 'error');
        return;
      }

      if (formType === 'OUT' && !formFromWhId) {
        showToast(t('errOutboundNoFromWh'), 'error');
        return;
      }
      if (formType === 'IN' && !formToWhId) {
        showToast(t('errInboundNoToWh'), 'error');
        return;
      }
      if (formType === 'TRANSFER' && (!formFromWhId || !formToWhId)) {
        showToast(t('errTransferNoWh'), 'error');
        return;
      }
      if (formType === 'TRANSFER' && formFromWhId === formToWhId) {
        showToast(t('errTransferSameWh'), 'error');
        return;
      }

      setIsSubmitting(true);
      try {
        if (onSubmit) {
          for (const item of itemsList) {
            await onSubmit({
              itemId: item.itemId,
              qty: item.qty,
              type: formType,
              fromWarehouseId: formType === 'IN' ? null : formFromWhId,
              toWarehouseId: formType === 'OUT' ? null : formToWhId,
              remarks: formRemarks,
            });
          }
        } else {
          for (const item of itemsList) {
            await createMove({
              itemId: item.itemId,
              qty: item.qty,
              type: formType,
              fromWarehouseId: formType === 'IN' ? null : formFromWhId,
              toWarehouseId: formType === 'OUT' ? null : formToWhId,
              remarks: formRemarks,
            });
          }
          showToast(t('movementSuccess'), 'success');
          setItemsList([]);
          setFormQty('');
          setFormRemarks('');
        }
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        showToast(error.message || t('errMovementFailed'), 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const hasNoItems = items.length === 0;
  const hasNoWarehouses = warehouses.length === 0;

  return (
    <UdsCard title={title || t('registerMovement')} action={action} className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden gap-4 h-full">
        {(hasNoItems || hasNoWarehouses) && (
          <div className="p-3 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            {t('noItemsOrWarehouses')}
          </div>
        )}

          {!lockItem ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1 overflow-hidden h-full">
              {/* 左列：流转控制和物料快速网格录入 */}
              <div className="flex flex-col gap-4 overflow-hidden pr-2 h-full max-h-full">
                <div className="grid grid-cols-12 gap-3 items-end shrink-0">
                  {/* 流转性质 */}
                  <div className="col-span-3">
                    <UdsSelect
                      label={t('movementType')}
                      options={[
                        { value: 'IN', label: t('inbound') },
                        { value: 'OUT', label: t('outbound') },
                        { value: 'TRANSFER', label: t('transfer') },
                      ]}
                      value={formType}
                      onChange={(e) => {
                        const type = e.target.value as 'IN' | 'OUT' | 'TRANSFER';
                        setFormType(type);
                      }}
                      disabled={isSubmitting || lockType}
                    />
                  </div>

                  {/* 仓库与备注的自适应平铺 */}
                  {formType === 'IN' && (
                    <>
                      <div className="col-span-3">
                        <UdsSelect
                          label={t('toWh')}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          value={formToWhId}
                          onChange={(e) => setFormToWhId(e.target.value)}
                          disabled={isSubmitting || lockToWarehouse}
                        />
                      </div>
                      <div className="col-span-6">
                        <UdsInput
                          label={t('remarks')}
                          placeholder={t('remarksPlaceholder')}
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}

                  {formType === 'OUT' && (
                    <>
                      <div className="col-span-3">
                        <UdsSelect
                          label={t('fromWh')}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          value={formFromWhId}
                          onChange={(e) => setFormFromWhId(e.target.value)}
                          disabled={isSubmitting || lockFromWarehouse}
                        />
                      </div>
                      <div className="col-span-6">
                        <UdsInput
                          label={t('remarks')}
                          placeholder={t('remarksPlaceholder')}
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}

                  {formType === 'TRANSFER' && (
                    <>
                      <div className="col-span-3">
                        <UdsSelect
                          label={t('fromWh')}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          value={formFromWhId}
                          onChange={(e) => setFormFromWhId(e.target.value)}
                          disabled={isSubmitting || lockFromWarehouse}
                        />
                      </div>
                      <div className="col-span-3">
                        <UdsSelect
                          label={t('toWh')}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          value={formToWhId}
                          onChange={(e) => setFormToWhId(e.target.value)}
                          disabled={isSubmitting || lockToWarehouse}
                        />
                      </div>
                      <div className="col-span-3">
                        <UdsInput
                          label={t('remarks')}
                          placeholder={t('remarksPlaceholder')}
                          value={formRemarks}
                          onChange={(e) => setFormRemarks(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-dashed border-white/5 pt-4 my-1 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    {t('addMovementDetail')}
                  </span>
                </div>

                <div className="flex flex-col gap-3 bg-[#121214]/50 border border-solid border-white/5 p-4 rounded-2xl flex-1 min-h-0 overflow-hidden mb-1">
                  {/* 列头 */}
                  <div className="grid grid-cols-12 gap-2 pb-2 border-b border-solid border-white/5 items-center shrink-0">
                    <div className="col-span-1 text-[8px] font-mono text-neutral-600 text-center">#</div>
                    <div className="col-span-7 text-[9px] font-black uppercase tracking-widest text-neutral-500">
                      {t('movementItemSelect') || '物料选择'}
                    </div>
                    <div className="col-span-4 text-[9px] font-black uppercase tracking-widest text-neutral-500 text-center">
                      {t('qty') || '数量'}
                    </div>
                  </div>

                  {/* 5 行网格 */}
                  <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 flex-1 min-h-0">
                    {quickRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-1 text-[9px] font-mono text-neutral-500 text-center select-none">
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="col-span-7">
                          <select
                            value={row.itemId}
                            onChange={(e) => handleQuickRowChange(idx, 'itemId', e.target.value)}
                            className="w-full h-10 text-[11px] rounded-lg border-none bg-white/5 text-neutral-300 px-3 cursor-pointer focus:outline-none focus:bg-white/10 transition-all font-semibold font-sans"
                            disabled={isSubmitting}
                          >
                            <option value="" className="bg-[#121214] text-neutral-500">-- 请选择物料 --</option>
                            {items.map(it => (
                              <option key={it.id} value={it.id} className="bg-[#121214] text-neutral-300">
                                [{it.code}] {it.name} ({it.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            min="1"
                            placeholder="数量"
                            value={row.qty}
                            onChange={(e) => handleQuickRowChange(idx, 'qty', e.target.value)}
                            className="w-full h-10 text-[11px] font-mono font-semibold rounded-lg border-none bg-white/5 text-neutral-300 px-3 text-center focus:outline-none focus:bg-white/10 transition-all"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 操作按钮区：手动增行与移入待流转清单 */}
                  <div className="flex gap-3 shrink-0 mt-2">
                    <UdsButton
                      type="button"
                      variant="ghost"
                      className="flex-1 h-9 border-dashed border-white/5 hover:border-white/10 text-[9px] font-black uppercase tracking-wider"
                      onClick={handleAddQuickRow}
                      disabled={isSubmitting}
                    >
                      {t('addInputRow') || '+ 添加录入行'}
                    </UdsButton>
                    <UdsButton
                      type="button"
                      variant="primary"
                      className="flex-1 h-9 text-[9px] font-black uppercase tracking-wider"
                      onClick={handleAddQuickRows}
                      disabled={isSubmitting}
                    >
                      {t('stageItemsToList') || '移入待流转清单'}
                    </UdsButton>
                  </div>
                </div>
              </div>

              {/* 右列：待流转明细展示与一键提交 */}
              <div className="flex flex-col gap-4 h-full justify-between overflow-hidden">
                <div className="border border-dashed border-white/10 rounded-2xl p-4 bg-white/2 flex flex-col flex-1 overflow-hidden">
                  <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 pb-2 border-b border-solid border-white/5">
                    {t('movementItemsList')}
                  </div>
                  <div className="overflow-y-auto flex flex-col gap-2 flex-1 pr-1">
                    {itemsList.map((item, idx) => {
                      const matchedItem = items.find(it => it.id === item.itemId);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-3 p-2.5 bg-[#121214] rounded-xl border border-solid border-white/5 text-xs animate-in fade-in duration-300">
                          <div className="flex flex-col">
                            <span className="font-semibold text-neutral-200">{matchedItem?.name || '未知物料'}</span>
                            <span className="text-[8px] font-mono text-neutral-500">{matchedItem?.code}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-neutral-200">
                              {item.qty} <span className="text-[9px] text-neutral-500">{matchedItem?.unit}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer font-black text-[10px] uppercase tracking-wider transition-all"
                            >
                              {t('remove')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {itemsList.length === 0 && (
                      <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                          暂无待流转明细
                        </span>
                        <span className="text-[8px] font-mono text-neutral-600/60 mt-1 uppercase tracking-widest">
                          Please add items on the left
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting || itemsList.length === 0}
                  >
                    {isSubmitting ? t('transacting') : t('confirmMovement')}
                  </UdsButton>
                </div>
              </div>
            </div>
          ) : (
            // 锁定单物料模式（如采购收货）
            <div className="flex flex-col gap-4">
              <UdsSelect
                label={t('movementType')}
                options={[
                  { value: 'IN', label: t('inbound') },
                  { value: 'OUT', label: t('outbound') },
                  { value: 'TRANSFER', label: t('transfer') },
                ]}
                value={formType}
                onChange={(e) => {
                  const type = e.target.value as 'IN' | 'OUT' | 'TRANSFER';
                  setFormType(type);
                }}
                disabled={isSubmitting || lockType}
              />

              <div className="grid grid-cols-2 gap-4">
                {(formType === 'OUT' || formType === 'TRANSFER') && (
                  <UdsSelect
                    label={t('fromWh')}
                    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                    value={formFromWhId}
                    onChange={(e) => setFormFromWhId(e.target.value)}
                    disabled={isSubmitting || lockFromWarehouse}
                  />
                )}

                {(formType === 'IN' || formType === 'TRANSFER') && (
                  <UdsSelect
                    label={t('toWh')}
                    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                    value={formToWhId}
                    onChange={(e) => setFormToWhId(e.target.value)}
                    disabled={isSubmitting || lockToWarehouse}
                  />
                )}
              </div>

              <UdsInput
                label={t('remarks')}
                placeholder={t('remarksPlaceholder')}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                disabled={isSubmitting}
              />

              <UdsSelect
                label={t('movementItemSelect')}
                options={items.map((it) => ({ value: it.id, label: `[${it.code}] ${it.name} (${it.unit})` }))}
                value={formItemId}
                onChange={(e) => setFormItemId(e.target.value)}
                disabled={true}
              />

              <UdsInput
                label={t('qty')}
                type="number"
                min="1"
                max={maxQty}
                placeholder={maxQty ? `Max: ${maxQty}` : t('qtyPlaceholder')}
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                disabled={isSubmitting}
                required
              />

              <div className="border-t border-solid border-white/5 pt-4">
                <UdsButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('transacting') : t('confirmMovement')}
                </UdsButton>
              </div>
            </div>
          )}
      </form>
    </UdsCard>
  );
};
