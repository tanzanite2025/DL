import React from 'react';
import { UdsButton, UdsInput } from '../uds/UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import type { Item, Currency } from '../../types';
import type { Unit } from '../../hooks/useUnits';

export interface BomComponentRow {
  componentItemId: string;
  componentItem: Item;
  quantity: number;
  remarks?: string;
}

interface BomConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  bomComponents: BomComponentRow[];
  newComponentId: string;
  newComponentQty: string;
  newBomName: string;
  newBomUnit: string;
  newBomDesc: string;
  newBomCurrencyId: string;
  items: Item[];
  units: Unit[];
  currencies: Currency[];
  bomCostSummary: Record<string, number>;
  isSaving: boolean;
  onBomNameChange: (value: string) => void;
  onBomUnitChange: (value: string) => void;
  onBomDescChange: (value: string) => void;
  onBomCurrencyIdChange: (value: string) => void;
  onComponentIdChange: (value: string) => void;
  onComponentQtyChange: (value: string) => void;
  onAddComponent: () => void;
  onRemoveComponent: (componentItemId: string) => void;
  onSaveBom: () => void;
}

export const BomConfigModal: React.FC<BomConfigModalProps> = ({
  isOpen,
  onClose,
  bomComponents,
  newComponentId,
  newComponentQty,
  newBomName,
  newBomUnit,
  newBomDesc,
  newBomCurrencyId,
  items,
  units,
  currencies,
  bomCostSummary,
  isSaving,
  onBomNameChange,
  onBomUnitChange,
  onBomDescChange,
  onBomCurrencyIdChange,
  onComponentIdChange,
  onComponentQtyChange,
  onAddComponent,
  onRemoveComponent,
  onSaveBom,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
        <h3 className="text-lg font-black uppercase tracking-wider text-white mb-6">
          {t('configureBom')}
        </h3>

        <div className="flex flex-col gap-5">
          {/* 新建 BOM 成品 */}
          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                {t('bomConfig')}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <UdsInput
                label={t('bomName')}
                placeholder={t('bomName')}
                value={newBomName}
                onChange={(e) => onBomNameChange(e.target.value)}
                required
              />
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">
                  {t('itemUnit')}
                </label>
                <select
                  className="w-full h-12 px-4 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                  value={newBomUnit}
                  onChange={(e) => onBomUnitChange(e.target.value)}
                >
                  {units.length === 0 && (
                    <option value={newBomUnit}>{newBomUnit}</option>
                  )}
                  {units.map((u) => (
                    <option key={u.id} value={u.name} className="bg-[#121214] text-white">
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>
              <UdsInput
                label={t('bomDesc')}
                placeholder={t('bomDesc')}
                value={newBomDesc}
                onChange={(e) => onBomDescChange(e.target.value)}
              />
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">
                  币种
                </label>
                <select
                  className="w-full h-12 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                  value={newBomCurrencyId}
                  onChange={(e) => onBomCurrencyIdChange(e.target.value)}
                  required
                >
                  <option value="">选择币种</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#121214] text-white">
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BOM 清单配置：为当前准备创建的 BOM 成品配置物料清单 */}
          <div className="border-t border-white/5 pt-4 flex flex-col gap-4">
            {/* 添加物料 */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                {t('addComponent')}
              </label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                  value={newComponentId}
                  onChange={(e) => onComponentIdChange(e.target.value)}
                >
                  <option value="">{t('componentItem')}</option>
                  {items
                    .filter((i) => !bomComponents.some((c) => c.componentItemId === i.id))
                    .map((item) => (
                      <option key={item.id} value={item.id} className="bg-[#121214] text-white">
                        {item.code} - {item.name}
                      </option>
                    ))}
                </select>
                <UdsInput
                  type="number"
                  min="1"
                  value={newComponentQty}
                  onChange={(e) => onComponentQtyChange(e.target.value)}
                  placeholder={t('requiredQty')}
                  className="w-24"
                />
                <UdsButton onClick={onAddComponent} variant="ghost">
                  +
                </UdsButton>
              </div>
            </div>

            {/* 物料列表 */}
            {bomComponents.length > 0 ? (
              <div className="border-t border-white/5 pt-4 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                  {t('bomComponents')}
                </label>
                {bomComponents.map((comp) => (
                  <div
                    key={comp.componentItemId}
                    className="flex items-center justify-between bg-[#1c1c1e]/30 rounded-2xl px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {comp.componentItem.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-2 mt-1">
                        <span>{comp.componentItem.code}</span>
                        <span className="opacity-50">|</span>
                        <span className="text-amber-500 font-bold">
                          {comp.componentItem.currency?.symbol}
                          {comp.componentItem.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                          {' / '}
                          {comp.componentItem.unit}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end mr-4">
                      <div className="text-sm font-bold text-neutral-300">
                        × {comp.quantity}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        小计:{' '}
                        <span className="text-white font-bold">
                          {comp.componentItem.currency?.symbol}
                          {((comp.componentItem.cost || 0) * comp.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <UdsButton
                      variant="ghost"
                      className="h-7 w-7 !p-0 rounded-full text-rose-500 hover:text-rose-400"
                      onClick={() => onRemoveComponent(comp.componentItemId)}
                    >
                      ×
                    </UdsButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[10px] text-neutral-600">
                {t('noBomComponents')}
              </div>
            )}

            {/* 成本汇总预估卡片 */}
            {bomComponents.length > 0 && (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-4 mt-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                  预估总成本 (依各币种)
                </div>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(bomCostSummary).map(([symbol, total]) => (
                    <div
                      key={symbol}
                      className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"
                    >
                      <span className="text-sm font-bold text-emerald-400">{symbol}</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 保存 BOM 按钮 */}
            <div className="border-t border-white/5 pt-4">
              <UdsButton
                variant="primary"
                className="w-full"
                onClick={onSaveBom}
                disabled={isSaving || bomComponents.length === 0}
              >
                {isSaving ? t('loading') : t('save')}
              </UdsButton>
            </div>
          </div>

          {/* 关闭弹窗 */}
          <div className="flex justify-end pt-2">
            <UdsButton
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              {t('cancel')}
            </UdsButton>
          </div>
        </div>
      </div>
    </div>
  );
};
