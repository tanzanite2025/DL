import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { Package, Trash2, Edit3, Box } from 'lucide-react';
import { Item, ShowToast } from '../types';
import { useItems } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { assemblyApi } from '../services/api';

interface ProductsManagementProps {
  token: string;
  showToast: ShowToast;
}

export const ProductsManagement: React.FC<ProductsManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { items, isLoading, createItem, updateItem, deleteItem } = useItems();
  const { warehouses } = useWarehouses();

  // 表单状态
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('件');
  const [itemDescription, setItemDescription] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // 组装模态框状态
  const [assemblyModalOpen, setAssemblyModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [assemblyQty, setAssemblyQty] = useState('1');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [assemblyRemarks, setAssemblyRemarks] = useState('');
  const [isAssembling, setIsAssembling] = useState(false);

  // 登记或更新物料商品
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemUnit.trim()) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }

    const payload: any = {
      name: itemName.trim(),
      unit: itemUnit.trim(),
      description: itemDescription.trim() || null
    };

    // 编辑状态下额外携带 code
    if (editingItemId) {
      payload.code = itemCode.trim();
    }

    try {
      if (editingItemId) {
        await updateItem(editingItemId, {
          code: itemCode.trim(),
          name: itemName.trim(),
          unit: itemUnit.trim(),
          description: itemDescription.trim() || undefined,
        });
      } else {
        await createItem({
          name: itemName.trim(),
          unit: itemUnit.trim(),
          description: itemDescription.trim() || undefined,
        });
      }

      showToast(
        editingItemId ? t('itemUpdatedSuccess') : t('itemRegisteredSuccess'), 
        'success'
      );
      
      // 清空表单
      setItemCode('');
      setItemName('');
      setItemUnit('件');
      setItemDescription('');
      setEditingItemId(null);
    } catch (error: any) {
      showToast(error.message || t('errItemFormRequired'), 'error');
    }
  };

  // 触发编辑
  const startEdit = (item: Item) => {
    setEditingItemId(item.id);
    setItemCode(item.code);
    setItemName(item.name);
    setItemUnit(item.unit);
    setItemDescription(item.description || '');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingItemId(null);
    setItemCode('');
    setItemName('');
    setItemUnit('件');
    setItemDescription('');
  };

  // 删除产品
  const handleDelete = async (id: string) => {
    if (!window.confirm(t('itemDeleteConfirm'))) {
      return;
    }

    try {
      await deleteItem(id);
      showToast(t('itemDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  // 打开组装模态框
  const openAssemblyModal = async (item: Item) => {
    setSelectedItem(item);
    setAssemblyModalOpen(true);
    setAssemblyQty('1');
    setAssemblyRemarks('');
    if (warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  };

  // 关闭组装模态框
  const closeAssemblyModal = () => {
    setAssemblyModalOpen(false);
    setSelectedItem(null);
    setAssemblyQty('1');
    setAssemblyRemarks('');
  };

  // 执行组装
  const handleAssemble = async () => {
    if (!selectedItem || !selectedWarehouseId || !assemblyQty) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }

    const qty = parseInt(assemblyQty);
    if (isNaN(qty) || qty <= 0) {
      showToast(t('errMovementFormInvalid'), 'error');
      return;
    }

    setIsAssembling(true);
    try {
      // 先检查库存
      const checkResult = await assemblyApi.check({
        assembledItemId: selectedItem.id,
        quantity: qty,
        warehouseId: selectedWarehouseId,
      }) as { canAssemble: boolean; insufficient?: Array<{ componentId: string; need: number; available: number }> };

      if (!checkResult.canAssemble) {
        showToast(t('errStockInsufficient'), 'error');
        setIsAssembling(false);
        return;
      }

      // 执行组装
      await assemblyApi.assemble({
        assembledItemId: selectedItem.id,
        quantity: qty,
        warehouseId: selectedWarehouseId,
        remarks: assemblyRemarks,
      });

      showToast(t('assembleSuccess'), 'success');
      closeAssemblyModal();
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsAssembling(false);
    }
  };

  if (isLoading && items.length === 0) {
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
        title={t('productsHeader')}
        description={t('productsDesc')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：表单配置 */}
        <div className="lg:col-span-5">
          <UdsCard
            title={editingItemId ? t('editProduct') : t('registerProduct')}
            action={
              editingItemId && (
                <UdsButton variant="ghost" onClick={cancelEdit} className="h-7 px-3">
                  {t('cancel')}
                </UdsButton>
              )
            }
          >
            <form onSubmit={handleSaveItem} className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <UdsInput
                    label={t('itemCode')}
                    value={editingItemId ? itemCode : t('systemAutoAssigned')}
                    disabled
                  />
                </div>
                <div>
                  <UdsInput
                    label={t('itemUnit')}
                    placeholder={t('itemUnitPlaceholder')}
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <UdsInput
                label={t('itemName')}
                placeholder={t('itemNamePlaceholder')}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />

              <UdsInput
                label={t('itemDesc')}
                placeholder={t('itemDescPlaceholder')}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
              />

              <div className="border-t border-solid border-white/5 pt-4">
                <UdsButton type="submit" variant="primary" className="w-full">
                  {editingItemId ? t('saveChanges') : t('registerProduct')}
                </UdsButton>
              </div>
            </form>
          </UdsCard>
        </div>

        {/* 右侧：列表账册 */}
        <div className="lg:col-span-7">
          <UdsCard title={t('registeredProductLedger')}>
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
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('itemSpecCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                      {t('actionsColumn')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs"
                    >
                      <td className="py-3.5 pl-2 font-mono font-bold text-neutral-200">
                        {item.code}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                          <Package size={13} className="text-neutral-400" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-neutral-400">
                        {item.unit}
                      </td>
                      <td className="py-3.5 text-neutral-500 font-mono text-[10px] max-w-[150px] truncate">
                        {item.description || '-'}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-2">
                          <UdsButton
                            variant="ghost"
                            className="h-7 px-2 rounded-full border-none text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-[10px] font-black uppercase"
                            onClick={() => openAssemblyModal(item)}
                            title={t('executeAssembly')}
                          >
                            <Box size={11} className="mr-1" />
                            {t('executeAssembly')}
                          </UdsButton>
                          <UdsButton
                            variant="ghost"
                            className="h-7 w-7 !p-0 rounded-full border-none text-neutral-400 hover:text-white"
                            onClick={() => startEdit(item)}
                          >
                            <Edit3 size={11} />
                          </UdsButton>
                          <UdsButton
                            variant="ghost"
                            className="h-7 w-7 !p-0 rounded-full border-none text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={11} />
                          </UdsButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                        {t('noProductsRegistered')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </UdsCard>
        </div>
      </div>

      {/* 组装模态框 */}
      {assemblyModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
              <Box size={20} className="text-emerald-400" />
              {t('executeAssembly')}
            </h3>

            <div className="flex flex-col gap-4 mb-6">
              {/* 产品名称 */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  {t('itemName')}
                </label>
                <div className="bg-[#1c1c1e]/50 rounded-2xl px-4 py-3 text-sm text-neutral-200 font-semibold">
                  {selectedItem.name} ({selectedItem.code})
                </div>
              </div>

              {/* 仓库选择 */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  {t('warehouseName')}
                </label>
                <select
                  className="w-full h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id} className="bg-[#121214] text-white">
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 组装数量 */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  {t('assemblyQty')}
                </label>
                <UdsInput
                  type="number"
                  min="1"
                  value={assemblyQty}
                  onChange={(e) => setAssemblyQty(e.target.value)}
                  placeholder="1"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  {t('remarks')}
                </label>
                <UdsInput
                  value={assemblyRemarks}
                  onChange={(e) => setAssemblyRemarks(e.target.value)}
                  placeholder={t('remarksPlaceholder')}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 border-t border-white/5 pt-6">
              <UdsButton
                variant="ghost"
                onClick={closeAssemblyModal}
                className="flex-1"
                disabled={isAssembling}
              >
                {t('cancel')}
              </UdsButton>
              <UdsButton
                variant="primary"
                onClick={handleAssemble}
                className="flex-1"
                disabled={isAssembling}
              >
                {isAssembling ? t('loading') : t('executeAssembly')}
              </UdsButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
