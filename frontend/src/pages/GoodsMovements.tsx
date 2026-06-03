import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsBadge } from '../components/uds/UdsComponents';
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
  const { moves, isLoading: movesLoading, fetchMoves, createMove, deleteMove } = useGoodsMoves();
  const [stockMatrix, setStockMatrix] = useState<StockMatrixRow[]>([]);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const isLoading = itemsLoading || whLoading || movesLoading;

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
    </div>
  );
};
