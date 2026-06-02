import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { MoveRight, RefreshCw } from 'lucide-react';
import { Item, Warehouse, GoodsMove, StockMatrixRow, ShowToast } from '../types';
import { useItems } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { useGoodsMoves } from '../hooks/useGoodsMoves';

interface GoodsMovementsProps {
  token: string;
  showToast: ShowToast;
}

export const GoodsMovements: React.FC<GoodsMovementsProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { items, isLoading: itemsLoading, fetchItems } = useItems();
  const { warehouses, isLoading: whLoading, fetchWarehouses } = useWarehouses();
  const { moves, isLoading: movesLoading, fetchMoves, createMove } = useGoodsMoves();
  const [stockMatrix, setStockMatrix] = useState<StockMatrixRow[]>([]);
  const isLoading = itemsLoading || whLoading || movesLoading;

  // 流转表单状态
  const [formItemId, setFormItemId] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formType, setFormType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN');
  const [formFromWhId, setFormFromWhId] = useState('');
  const [formToWhId, setFormToWhId] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 计算每个物料在各个仓库中的现有库存
  const calculateStockMatrix = (itemsList: Item[], whList: Warehouse[], movesList: GoodsMove[]) => {
    const matrixMap: Record<string, StockMatrixRow> = {};

    itemsList.forEach((item) => {
      matrixMap[item.id] = {
        itemCode: item.code,
        itemName: item.name,
        unit: item.unit,
        warehouseStocks: {},
        totalStock: 0,
      };
      whList.forEach((wh) => {
        matrixMap[item.id].warehouseStocks[wh.id] = 0;
      });
    });

    movesList.forEach((move) => {
      const row = matrixMap[move.itemId];
      if (!row) return;

      if (move.type === 'IN') {
        if (move.toWarehouseId) {
          row.warehouseStocks[move.toWarehouseId] = (row.warehouseStocks[move.toWarehouseId] || 0) + move.qty;
          row.totalStock += move.qty;
        }
      } else if (move.type === 'OUT') {
        if (move.fromWarehouseId) {
          row.warehouseStocks[move.fromWarehouseId] = (row.warehouseStocks[move.fromWarehouseId] || 0) - move.qty;
          row.totalStock -= move.qty;
        }
      } else if (move.type === 'TRANSFER') {
        if (move.fromWarehouseId && move.toWarehouseId) {
          row.warehouseStocks[move.fromWarehouseId] = (row.warehouseStocks[move.fromWarehouseId] || 0) - move.qty;
          row.warehouseStocks[move.toWarehouseId] = (row.warehouseStocks[move.toWarehouseId] || 0) + move.qty;
        }
      }
    });

    setStockMatrix(Object.values(matrixMap));
  };

  // 数据加载后计算矩阵并设置默认表单值
  React.useEffect(() => {
    if (!isLoading) {
      calculateStockMatrix(items, warehouses, moves);
      if (items.length > 0 && !formItemId) setFormItemId(items[0].id);
      if (warehouses.length > 0 && !formFromWhId) {
        setFormFromWhId(warehouses[0].id);
        setFormToWhId(warehouses[0].id);
      }
    }
  }, [isLoading, items, warehouses, moves]);

  const fetchData = async () => {
    await Promise.all([fetchItems(), fetchWarehouses(), fetchMoves()]);
  };

  // 提交货物流转登记（采用乐观更新）
  const handleRegisterMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyInt = parseInt(formQty);

    if (!formItemId || isNaN(qtyInt) || qtyInt <= 0) {
      showToast(t('errMovementFormInvalid'), 'error');
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

    // 出库或调拨时的源仓库库存校验
    if (formType === 'OUT' || formType === 'TRANSFER') {
      const selectedItemRow = stockMatrix.find(r => {
        const item = items.find(it => it.id === formItemId);
        return item && r.itemCode === item.code;
      });
      const sourceQty = selectedItemRow?.warehouseStocks[formFromWhId] || 0;
      if (sourceQty < qtyInt) {
        showToast(`${t('errInsufficientStock')}: ${sourceQty}`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      itemId: formItemId,
      qty: qtyInt,
      type: formType,
      fromWarehouseId: formType === 'IN' ? null : formFromWhId,
      toWarehouseId: formType === 'OUT' ? null : formToWhId,
      remarks: formRemarks,
    };

    try {
      await createMove(payload);
      showToast(t('movementSuccess'), 'success');
      setFormQty('');
      setFormRemarks('');
    } catch (error: any) {
      showToast(error.message || t('errMovementFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* 页眉 - 已隐藏（保留代码便于定位） */}
      <UdsHeader
        className="hidden"
        title={t('stockFlowHeader')}
        description={t('stockFlowDesc')}
        actions={
          <UdsButton variant="ghost" onClick={fetchData} className="h-9 px-3">
            <RefreshCw size={12} className="mr-1" /> {t('refresh')}
          </UdsButton>
        }
      />

      {/* 库存矩阵总览 */}
      <UdsCard title={t('inventoryMatrix')}>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-solid border-white/10">
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                  {t('itemCodeCol2')}
                </th>
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                  {t('itemNameCol2')}
                </th>
                {warehouses.map((wh) => (
                  <th key={wh.id} className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                    {wh.name}
                  </th>
                ))}
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                  {t('totalStock')}
                </th>
              </tr>
            </thead>
            <tbody>
              {stockMatrix.map((row) => (
                <tr
                  key={row.itemCode}
                  className="border-b border-solid border-white/5 hover:bg-white/2 transition-all"
                >
                  <td className="py-3.5 pl-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-200">{row.itemCode}</span>
                  </td>
                  <td className="py-3.5">
                    <span className="text-xs font-semibold text-neutral-300">{row.itemName}</span>
                  </td>
                  {warehouses.map((wh) => {
                    const qty = row.warehouseStocks[wh.id] || 0;
                    return (
                      <td key={wh.id} className="py-3.5 text-center">
                        <span className={`text-xs font-mono font-semibold ${qty > 0 ? 'text-neutral-200' : 'text-neutral-600'}`}>
                          {qty} <span className="text-[9px] text-neutral-600">{row.unit}</span>
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3.5 text-right pr-2 font-semibold">
                    <span className={`text-xs font-mono ${row.totalStock > 0 ? 'text-neutral-200 font-bold' : 'text-neutral-600'}`}>
                      {row.totalStock} <span className="text-[9px] text-neutral-600">{row.unit}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {stockMatrix.length === 0 && (
                <tr>
                  <td colSpan={3 + warehouses.length} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                    {t('noInventoryData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </UdsCard>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：流转登记表单 */}
        <div className="lg:col-span-5">
          <UdsCard title={t('registerMovement')}>
            {items.length === 0 || warehouses.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-rose-500/20 bg-rose-500/5 text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center">
                {t('noItemsOrWarehouses')}
              </div>
            ) : (
              <form onSubmit={handleRegisterMovement} className="flex flex-col gap-4">
                <UdsSelect
                  label={t('movementItemSelect')}
                  options={items.map((it) => ({ value: it.id, label: `[${it.code}] ${it.name} (${it.unit})` }))}
                  value={formItemId}
                  onChange={(e) => setFormItemId(e.target.value)}
                  disabled={isSubmitting}
                />

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
                  disabled={isSubmitting}
                />

                <div className="grid grid-cols-2 gap-4">
                  {(formType === 'OUT' || formType === 'TRANSFER') && (
                    <UdsSelect
                      label={t('fromWh')}
                      options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                      value={formFromWhId}
                      onChange={(e) => setFormFromWhId(e.target.value)}
                      disabled={isSubmitting}
                    />
                  )}

                  {(formType === 'IN' || formType === 'TRANSFER') && (
                    <UdsSelect
                      label={t('toWh')}
                      options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                      value={formToWhId}
                      onChange={(e) => setFormToWhId(e.target.value)}
                      disabled={isSubmitting}
                    />
                  )}
                </div>

                <UdsInput
                  label={t('qty')}
                  type="number"
                  min="1"
                  placeholder={t('qtyPlaceholder')}
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  disabled={isSubmitting}
                  required
                />

                <UdsInput
                  label={t('remarks')}
                  placeholder={t('remarksPlaceholder')}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  disabled={isSubmitting}
                />

                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? t('transacting') : t('confirmMovement')}
                  </UdsButton>
                </div>
              </form>
            )}
          </UdsCard>
        </div>

        {/* 右侧：流转记录 */}
        <div className="lg:col-span-7">
          <UdsCard title={t('movementLedger')}>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                      {t('dateCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('itemCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('typeCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('qtyCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                      {t('pathRemarksCol')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map((move) => (
                    <tr
                      key={move.id}
                      className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs"
                    >
                      <td className="py-3.5 pl-2 text-[9px] font-mono text-neutral-500">
                        {new Date(move.createdAt).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-200">{move.item?.name}</span>
                          <span className="text-[8px] font-mono text-neutral-500">{move.item?.code}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        {move.type === 'IN' && (
                          <UdsBadge status="healthy">{t('inboundBadge')}</UdsBadge>
                        )}
                        {move.type === 'OUT' && (
                          <UdsBadge status="alert">{t('outboundBadge')}</UdsBadge>
                        )}
                        {move.type === 'TRANSFER' && (
                          <UdsBadge status="default">{t('transferBadge')}</UdsBadge>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-mono font-semibold text-neutral-200">
                        {move.qty} <span className="text-[9px] text-neutral-500">{move.item?.unit}</span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-[9px] font-mono text-neutral-300">
                            {move.type === 'IN' && (
                              <>
                                <span>-</span>
                                <MoveRight size={10} className="text-neutral-500" />
                                <span>{move.toWarehouse?.name}</span>
                              </>
                            )}
                            {move.type === 'OUT' && (
                              <>
                                <span>{move.fromWarehouse?.name}</span>
                                <MoveRight size={10} className="text-neutral-500" />
                                <span>-</span>
                              </>
                            )}
                            {move.type === 'TRANSFER' && (
                              <>
                                <span>{move.fromWarehouse?.name}</span>
                                <MoveRight size={10} className="text-neutral-500" />
                                <span>{move.toWarehouse?.name}</span>
                              </>
                            )}
                          </div>
                          {move.remarks && (
                            <span className="text-[9px] text-neutral-500 font-sans mt-0.5 max-w-[200px] truncate">
                              {move.remarks}
                            </span>
                          )}
                          <span className="text-[8px] font-mono text-neutral-600 mt-0.5">
                            {t('op')}: {move.user?.username}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {moves.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                        {t('noMovesLogged')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </UdsCard>
        </div>
      </div>
    </div>
  );
};
