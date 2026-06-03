import React, { useState } from 'react';
import { UdsCard, UdsButton, UdsInput } from '../uds/UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import { useUnits } from '../../hooks/useUnits';
import { ShowToast } from '../../types';

interface UnitsSettingsCardProps {
  showToast: ShowToast;
}

export const UnitsSettingsCard: React.FC<UnitsSettingsCardProps> = ({ showToast }) => {
  const { t } = useI18n();
  const { units, isLoading: isLoadingUnits, createUnit, deleteUnit } = useUnits();
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!newUnitCode.trim() || !newUnitName.trim()) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }
    setIsSavingUnit(true);
    try {
      await createUnit({
        code: newUnitCode.trim(),
        name: newUnitName.trim(),
      });
      setNewUnitCode('');
      setNewUnitName('');
      showToast(t('addUnit'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该单位吗？已使用该单位的物料不会自动更新。')) return;
    try {
      await deleteUnit(id);
      showToast('单位已删除', 'success');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  return (
    <UdsCard title={t('unitsHeader')}>
      <div className="flex flex-col gap-4">
        {/* 新增单位 */}
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
          onSubmit={handleSubmit}
        >
          <UdsInput
            label={t('unitCode')}
            placeholder={t('unitCodePlaceholder')}
            value={newUnitCode}
            onChange={(e) => setNewUnitCode(e.target.value.toUpperCase())}
          />
          <UdsInput
            label={t('unitName')}
            placeholder={t('unitNamePlaceholder')}
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
          />
          <div className="flex md:justify-end">
            <UdsButton
              type="submit"
              variant="primary"
              className="w-full md:w-auto"
              disabled={isSavingUnit}
            >
              {isSavingUnit ? t('loading') : t('addUnit')}
            </UdsButton>
          </div>
        </form>

        {/* 单位列表 */}
        <div className="border-t border-white/5 pt-4">
          {isLoadingUnits ? (
            <div className="text-center py-3 text-[10px] text-neutral-500">{t('loading')}</div>
          ) : units.length === 0 ? (
            <div className="text-center py-3 text-[10px] text-neutral-600">
              暂无单位，请先新增。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 pl-2">
                      {t('unitCode')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2">
                      {t('unitName')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-2 text-right pr-2">
                      {t('actionsColumn')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-b border-solid border-white/5 text-xs">
                      <td className="py-2 pl-2 font-mono font-bold text-neutral-200">{u.code}</td>
                      <td className="py-2 text-neutral-200">{u.name}</td>
                      <td className="py-2 pr-2 text-right">
                        <UdsButton
                          variant="ghost"
                          className="h-7 w-7 !p-0 rounded-full border-none text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleDelete(u.id)}
                        >
                          ×
                        </UdsButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UdsCard>
  );
};
