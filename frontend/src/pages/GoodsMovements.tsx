import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsBadge, UdsInput } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { GoodsMovementForm } from '../components/uds/GoodsMovementForm';
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
  const { moves, isLoading: movesLoading, fetchMoves, deleteMove } = useGoodsMoves();
  const [stockMatrix, setStockMatrix] = useState<StockMatrixRow[]>([]);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [expandedWarehouseId, setExpandedWarehouseId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const isLoading = itemsLoading || whLoading || movesLoading;

  // 计算每个物料在各个仓库中的现有库存
  const calculateStockMatrix = (itemsList: Item[], whList: Warehouse[], movesList: GoodsMove[]) => {
    // 如果还没有配置任何仓库，则不计算矩阵，避免只看到一堆 0 却不知道属于哪个仓库
    if (!whList.length) {
      setStockMatrix([]);
      return;
    }
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
    }
  }, [isLoading, items, warehouses, moves]);

  const fetchData = async () => {
    await Promise.all([fetchItems(), fetchWarehouses(), fetchMoves()]);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('voidMovementConfirm') || '确定要作废并删除这条流转记录吗？作废后库存将自动重算恢复。')) {
      try {
        await deleteMove(id);
        showToast(t('voidSuccess') || '流转记录已成功作废', 'success');
        fetchData();
      } catch (err: any) {
        showToast(err.message || t('errVoidFailed') || '作废流转记录失败', 'error');
      }
    }
  };

  const globalSearch = inventorySearch.trim().toLowerCase();
  const globalRows = stockMatrix.filter((row) => {
    if (!row.totalStock) return false;
    if (!globalSearch) return true;
    return (
      row.itemCode.toLowerCase().includes(globalSearch) ||
      row.itemName.toLowerCase().includes(globalSearch)
    );
  });

  const globalSkuCount = globalRows.length;
  const globalTotalQty = globalRows.reduce((sum, row) => sum + row.totalStock, 0);

  const globalCostSummary = globalRows.reduce((acc, row) => {
    const item = items.find((it) => it.code === row.itemCode);
    if (!item) return acc;
    const symbol = item.currency?.symbol || '¥';
    const value = (item.cost || 0) * row.totalStock;
    if (!acc[symbol]) acc[symbol] = 0;
    acc[symbol] += value;
    return acc;
  }, {} as Record<string, number>);

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

      <div className="flex justify-end">
        <UdsButton variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => setIsAuditOpen(true)}>
          审计日志
        </UdsButton>
      </div>

      {globalRows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-4 text-[9px] font-mono text-neutral-400">
            <span>
              SKU: <span className="font-bold text-neutral-100">{globalSkuCount}</span>
            </span>
            <span>
              {t('totalStock')}: <span className="font-bold text-emerald-400">{globalTotalQty}</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(globalCostSummary).map(([symbol, total]) => (
              <span
                key={symbol}
                className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
              >
                {symbol}
                {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            ))}
          </div>
        </div>
      )}

      {warehouses.length > 0 && (
        <UdsCard title={t('warehouseInventoryTitle')}>
          <div className="flex items-center justify-end mb-2 px-2">
            <UdsInput
              label=" "
              placeholder={t('warehouseInventorySearchPlaceholder')}
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-56"
            />
          </div>
          <div className="flex flex-col divide-y divide-white/5">
            {warehouses.map((wh) => {
              const search = inventorySearch.trim().toLowerCase();

              const rows = stockMatrix
                .map((row) => {
                  const qty = row.warehouseStocks[wh.id] || 0;
                  if (!qty) return null;
                  return {
                    itemCode: row.itemCode,
                    itemName: row.itemName,
                    unit: row.unit,
                    qty,
                  };
                })
                .filter(
                  (r): r is { itemCode: string; itemName: string; unit: string; qty: number } =>
                    r !== null,
                )
                .filter((r) => {
                  if (!search) return true;
                  return (
                    r.itemCode.toLowerCase().includes(search) ||
                    r.itemName.toLowerCase().includes(search)
                  );
                });

              const isExpanded = expandedWarehouseId === wh.id;

              const costSummary = rows.reduce((acc, r) => {
                const item = items.find((it) => it.code === r.itemCode);
                if (!item) return acc;
                const symbol = item.currency?.symbol || '¥';
                const value = (item.cost || 0) * r.qty;
                if (!acc[symbol]) acc[symbol] = 0;
                acc[symbol] += value;
                return acc;
              }, {} as Record<string, number>);

              return (
                <div key={wh.id} className="py-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
                    onClick={() =>
                      setExpandedWarehouseId((prev) => (prev === wh.id ? null : wh.id))
                    }
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-neutral-200">{wh.name}</span>
                      {wh.location && (
                        <span className="text-[9px] text-neutral-500 font-mono mt-0.5">
                          {wh.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-mono text-neutral-500">
                        {t('totalStock')}: {" "}
                        <span className="font-bold text-emerald-400">
                          {rows.reduce((sum, r) => sum + r.qty, 0)}
                        </span>
                      </span>
                      <span className="text-[9px] font-mono text-neutral-500">
                        SKU: {rows.length}
                      </span>
                      {Object.entries(costSummary).map(([symbol, total]) => (
                        <span
                          key={symbol}
                          className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
                        >
                          {symbol}
                          {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ))}
                      <span className="text-[10px] text-neutral-400">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 px-2">
                      {rows.length === 0 ? (
                        <div className="text-center py-3 text-[10px] font-mono text-neutral-600">
                          {t('noWarehouseInventory')}
                        </div>
                      ) : (
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-solid border-white/10">
                                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 pl-2">
                                  {t('itemCodeCol')}
                                </th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2">
                                  {t('itemNameCol')}
                                </th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 text-center">
                                  {t('itemUnitCol')}
                                </th>
                                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 text-right pr-2">
                                  {t('totalStock')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row) => (
                                <tr
                                  key={row.itemCode}
                                  className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs"
                                >
                                  <td className="py-2.5 pl-2 font-mono font-bold text-neutral-200">
                                    {row.itemCode}
                                  </td>
                                  <td className="py-2.5 text-neutral-200">{row.itemName}</td>
                                  <td className="py-2.5 text-center text-neutral-300">{row.unit}</td>
                                  <td className="py-2.5 pr-2 text-right">
                                    <span
                                      className={`text-xs font-mono font-bold ${
                                        row.qty > 0 ? 'text-emerald-400' : 'text-rose-400'
                                      }`}
                                    >
                                      {row.qty}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </UdsCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 全宽：流转记录 */}
        <div className="lg:col-span-12">
          <UdsCard
            title={t('movementLedger')}
            action={
              <UdsButton
                variant="primary"
                className="h-9 px-4 text-[10px] font-black uppercase tracking-widest"
                onClick={() => setIsMovementModalOpen(true)}
              >
                {t('registerMovement')}
              </UdsButton>
            }
          >
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
                          <div className="flex items-center gap-2 mt-1 justify-end">
                            <span className="text-[8px] font-mono text-neutral-600">
                              {t('op')}: {move.user?.username}
                            </span>
                            <button
                              onClick={() => handleDelete(move.id)}
                              className="text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-1.5 py-0.5 rounded transition-colors"
                            >
                              {t('voidMovement') || '作废记录'}
                            </button>
                          </div>
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

      {/* 登记货物流转 Modal 弹窗 */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="relative w-full w-[85vw] max-w-7xl h-[80vh] flex flex-col animate-uds-fade">
            <GoodsMovementForm
              className="h-full flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden"
              showToast={showToast}
              onSuccess={() => {
                fetchData();
                setIsMovementModalOpen(false);
              }}
              action={
                <button
                  onClick={() => setIsMovementModalOpen(false)}
                  className="text-neutral-400 hover:text-white shrink-0 cursor-pointer p-1.5 rounded-full hover:bg-white/5 transition-all text-xs"
                >
                  {t('cancel')}
                </button>
              }
            />
          </div>
        </div>
      )}

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="goods-moves"
        title={t('movementLedger') || '货物流转审计'}
      />
    </div>
  );
};
