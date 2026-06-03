import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useI18n } from '../i18n/I18nContext';
import { Home, Trash2, Edit3 } from 'lucide-react';
import { Warehouse, ShowToast, GoodsMove, Item } from '../types';
import { useWarehouses } from '../hooks/useWarehouses';
import { useGoodsMoves } from '../hooks/useGoodsMoves';
import { useItems } from '../hooks/useItems';

interface WarehouseManagementProps {
  token: string;
  showToast: ShowToast;
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { warehouses, isLoading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
  const { moves } = useGoodsMoves();
  const { items } = useItems();
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // 仓库表单
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whDescription, setWhDescription] = useState('');
  const [editingWhId, setEditingWhId] = useState<string | null>(null);

  // 每个仓库的库存汇总（基于货物流转记录，跨所有物料的数量总和）
  const [warehouseStockSummary, setWarehouseStockSummary] = useState<Record<string, number>>({});

  // 仓库库存明细弹窗状态
  const [inventoryModalWh, setInventoryModalWh] = useState<Warehouse | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');

  React.useEffect(() => {
    if (!warehouses.length) {
      setWarehouseStockSummary({});
      return;
    }

    const summary: Record<string, number> = {};
    warehouses.forEach((wh) => {
      summary[wh.id] = 0;
    });

    moves.forEach((move) => {
      if (move.type === 'IN') {
        if (move.toWarehouseId) {
          summary[move.toWarehouseId] = (summary[move.toWarehouseId] || 0) + move.qty;
        }
      } else if (move.type === 'OUT') {
        if (move.fromWarehouseId) {
          summary[move.fromWarehouseId] = (summary[move.fromWarehouseId] || 0) - move.qty;
        }
      } else if (move.type === 'TRANSFER') {
        if (move.fromWarehouseId) {
          summary[move.fromWarehouseId] = (summary[move.fromWarehouseId] || 0) - move.qty;
        }
        if (move.toWarehouseId) {
          summary[move.toWarehouseId] = (summary[move.toWarehouseId] || 0) + move.qty;
        }
      }
    });

    setWarehouseStockSummary(summary);
  }, [warehouses, moves]);

  // 仓库保存（新建或编辑）
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim()) {
      showToast(t('whNameRequired'), 'error');
      return;
    }

    const payload = { name: whName, location: whLocation, description: whDescription };

    try {
      if (editingWhId) {
        await updateWarehouse(editingWhId, payload);
      } else {
        await createWarehouse(payload);
      }

      showToast(
        editingWhId ? t('whUpdatedSuccess') : t('whCreatedSuccess'), 
        'success'
      );
      setWhName('');
      setWhLocation('');
      setWhDescription('');
      setEditingWhId(null);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  // 触发编辑状态
  const startEditWarehouse = (wh: Warehouse) => {
    setEditingWhId(wh.id);
    setWhName(wh.name);
    setWhLocation(wh.location || '');
    setWhDescription(wh.description || '');
  };

  // 取消编辑
  const cancelEditWarehouse = () => {
    setEditingWhId(null);
    setWhName('');
    setWhLocation('');
    setWhDescription('');
  };

  // 删除仓库
  const handleDeleteWarehouse = async (id: string) => {
    if (!window.confirm(t('whDeleteConfirm'))) {
      return;
    }

    try {
      await deleteWarehouse(id);
      showToast(t('whDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  if (isLoading && warehouses.length === 0) {
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
        title={t('warehouseHeader')}
        description={t('warehouseDesc')}
      />

      <div className="flex justify-end">
        <UdsButton variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => setIsAuditOpen(true)}>
          审计日志
        </UdsButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：仓库配置表单 */}
        <div className="lg:col-span-5">
          <UdsCard
            title={editingWhId ? t('editWarehouse') : t('registerWarehouse')}
            action={
              editingWhId && (
                <UdsButton variant="ghost" onClick={cancelEditWarehouse} className="h-7 px-3">
                  {t('cancel')}
                </UdsButton>
              )
            }
          >
            <form onSubmit={handleSaveWarehouse} className="flex flex-col gap-4">
              <UdsInput
                label={t('warehouseName')}
                placeholder={t('whNamePlaceholder')}
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                required
              />
              <UdsInput
                label={t('location')}
                placeholder={t('locationPlaceholder')}
                value={whLocation}
                onChange={(e) => setWhLocation(e.target.value)}
              />
              <UdsInput
                label={t('description')}
                placeholder={t('descriptionPlaceholder')}
                value={whDescription}
                onChange={(e) => setWhDescription(e.target.value)}
              />
              <div className="border-t border-solid border-white/5 pt-4">
                <UdsButton type="submit" variant="primary" className="w-full">
                  {editingWhId ? t('saveChanges') : t('createWarehouse')}
                </UdsButton>
              </div>
            </form>
          </UdsCard>
        </div>

        {/* 右侧：仓库列表 */}
        <div className="lg:col-span-7">
          <UdsCard title={t('warehouseList')}>
            <div className="flex flex-col gap-4">
              {warehouses.map((wh) => {
                const whStock = warehouseStockSummary[wh.id] ?? 0;
                return (
                  <div
                    key={wh.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-1">
                        <Home size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-200">{wh.name}</h4>
                        <p className="text-[10px] text-neutral-400 mt-0.5">{wh.location || t('noLocation')}</p>
                        {wh.description && (
                          <p className="text-[8px] text-neutral-500 font-mono mt-1 uppercase tracking-wider">
                            {t('description')}: {wh.description}
                          </p>
                        )}
                        <p className="text-[9px] text-neutral-500 font-mono mt-1">
                          {t('totalStock')}: {' '}
                          <span className={whStock > 0 ? 'text-emerald-400 font-bold' : 'text-neutral-600'}>
                            {whStock}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <UdsButton
                        variant="ghost"
                        className="h-8 px-3 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setInventoryModalWh(wh)}
                      >
                        {t('warehouseInventoryTitle')}
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                        onClick={() => startEditWarehouse(wh)}
                      >
                        <Edit3 size={12} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDeleteWarehouse(wh.id)}
                      >
                        <Trash2 size={12} />
                      </UdsButton>
                    </div>
                  </div>
                );
              })}
              {warehouses.length === 0 && (
                <span className="text-[10px] font-mono text-neutral-600 text-center py-4 block">
                  {t('noActiveWarehouses')}
                </span>
              )}
            </div>
          </UdsCard>
        </div>
      </div>

      {/* 仓库库存明细弹窗 */}
      {inventoryModalWh && (
        <WarehouseInventoryModal
          warehouse={inventoryModalWh}
          items={items}
          moves={moves}
          search={inventorySearch}
          setSearch={setInventorySearch}
          onClose={() => {
            setInventoryModalWh(null);
            setInventorySearch('');
          }}
          t={t as any}
        />
      )}

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="warehouses"
        title={t('warehouseHeader') || '仓库审计'}
      />
    </div>
  );
};

interface WarehouseInventoryModalProps {
  warehouse: Warehouse;
  items: Item[];
  moves: GoodsMove[];
  search: string;
  setSearch: (value: string) => void;
  onClose: () => void;
  t: (key: any) => string;
}

const WarehouseInventoryModal: React.FC<WarehouseInventoryModalProps> = ({
  warehouse,
  items,
  moves,
  search,
  setSearch,
  onClose,
  t,
}) => {
  const stockByItem: Record<string, { item: Item; qty: number }> = {};

  items.forEach((item) => {
    stockByItem[item.id] = { item, qty: 0 };
  });

  moves.forEach((move) => {
    const entry = stockByItem[move.itemId];
    if (!entry) return;

    if (move.type === 'IN' && move.toWarehouseId === warehouse.id) {
      entry.qty += move.qty;
    } else if (move.type === 'OUT' && move.fromWarehouseId === warehouse.id) {
      entry.qty -= move.qty;
    } else if (move.type === 'TRANSFER') {
      if (move.fromWarehouseId === warehouse.id) entry.qty -= move.qty;
      if (move.toWarehouseId === warehouse.id) entry.qty += move.qty;
    }
  });

  let rows = Object.values(stockByItem);

  if (search.trim()) {
    const s = search.trim().toLowerCase();
    rows = rows.filter(({ item }) =>
      item.code.toLowerCase().includes(s) || item.name.toLowerCase().includes(s)
    );
  }

  // 只展示库存非 0 的物料，保证列表更干净
  rows = rows.filter((r) => r.qty !== 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-[1200px] h-[75vh] mx-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              {t('warehouseInventoryTitle')} — {warehouse.name}
            </h3>
            <span className="text-[10px] font-mono text-neutral-500 mt-1">
              {warehouse.location || t('noLocation')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UdsInput
              label=" "
              placeholder={t('warehouseInventorySearchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <UdsButton variant="ghost" className="h-8 px-3" onClick={onClose}>
              {t('cancel')}
            </UdsButton>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 flex-1 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="text-center py-6 text-[10px] font-mono text-neutral-600">
              {t('noWarehouseInventory')}
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                      {t('itemCodeCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('itemNameCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('itemUnitCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                      {t('totalStock')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, qty }) => (
                    <tr key={item.id} className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs">
                      <td className="py-3.5 pl-2 font-mono font-bold text-neutral-200">{item.code}</td>
                      <td className="py-3.5 text-neutral-200">{item.name}</td>
                      <td className="py-3.5 text-center text-neutral-300">{item.unit}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <span className={`text-xs font-mono font-bold ${qty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {qty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
