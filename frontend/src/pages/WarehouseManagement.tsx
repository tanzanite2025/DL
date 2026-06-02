import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { Home, Trash2, Edit3 } from 'lucide-react';
import { Warehouse, ShowToast } from '../types';
import { useWarehouses } from '../hooks/useWarehouses';

interface WarehouseManagementProps {
  token: string;
  showToast: ShowToast;
}

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { warehouses, isLoading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();

  // 仓库表单
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const [whDescription, setWhDescription] = useState('');
  const [editingWhId, setEditingWhId] = useState<string | null>(null);

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
              {warehouses.map((wh) => (
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
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
              ))}
              {warehouses.length === 0 && (
                <span className="text-[10px] font-mono text-neutral-600 text-center py-4 block">
                  {t('noActiveWarehouses')}
                </span>
              )}
            </div>
          </UdsCard>
        </div>
      </div>
    </div>
  );
};
