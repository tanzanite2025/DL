import React from 'react';
import { UdsCard, UdsButton, UdsInput } from '../uds/UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import type { Unit } from '../../hooks/useUnits';
import type { Currency } from '../../types';

interface ProductFormPanelProps {
  editingItemId: string | null;
  itemCode: string;
  itemName: string;
  itemUnit: string;
  itemDescription: string;
  itemCost: string;
  itemCurrencyId: string;
  units: Unit[];
  currencies: Currency[];
  onItemCodeChange: (value: string) => void;
  onItemNameChange: (value: string) => void;
  onItemUnitChange: (value: string) => void;
  onItemDescriptionChange: (value: string) => void;
  onItemCostChange: (value: string) => void;
  onItemCurrencyIdChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  showCancelAction?: boolean;
}

export const ProductFormPanel: React.FC<ProductFormPanelProps> = ({
  editingItemId,
  itemCode,
  itemName,
  itemUnit,
  itemDescription,
  itemCost,
  itemCurrencyId,
  units,
  currencies,
  onItemCodeChange,
  onItemNameChange,
  onItemUnitChange,
  onItemDescriptionChange,
  onItemCostChange,
  onItemCurrencyIdChange,
  onSubmit,
  onCancel,
  showCancelAction = false,
}) => {
  const { t } = useI18n();

  return (
    <UdsCard
      title={editingItemId ? t('editProduct') : t('registerProduct')}
      action={
        (editingItemId || showCancelAction) && (
          <UdsButton variant="ghost" onClick={onCancel} className="h-7 px-3">
            {t('cancel')}
          </UdsButton>
        )
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <UdsInput
              label={t('itemCode')}
              value={editingItemId ? itemCode : t('systemAutoAssigned')}
              disabled
              onChange={(e) => onItemCodeChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">
              {t('itemUnit')}
            </label>
            <select
              className="w-full h-12 px-4 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
              value={itemUnit}
              onChange={(e) => onItemUnitChange(e.target.value)}
            >
              {units.length === 0 && (
                <option value={itemUnit}>{itemUnit}</option>
              )}
              {units.map((u) => (
                <option key={u.id} value={u.name} className="bg-[#121214] text-white">
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <UdsInput
          label={t('itemName')}
          placeholder={t('itemNamePlaceholder')}
          value={itemName}
          onChange={(e) => onItemNameChange(e.target.value)}
          required
        />

        <UdsInput
          label={t('itemDesc')}
          placeholder={t('itemDescPlaceholder')}
          value={itemDescription}
          onChange={(e) => onItemDescriptionChange(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <UdsInput
            label={t('itemCost')}
            placeholder={t('itemCost')}
            value={itemCost}
            onChange={(e) => onItemCostChange(e.target.value)}
            type="number"
            min="0"
          />
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-1.5">
              币种
            </label>
            <select
              className="w-full h-12 px-4 rounded-2xl border-none bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
              value={itemCurrencyId}
              onChange={(e) => onItemCurrencyIdChange(e.target.value)}
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

        <div className="border-t border-solid border-white/5 pt-4">
          <UdsButton type="submit" variant="primary" className="w-full">
            {editingItemId ? t('saveChanges') : t('registerProduct')}
          </UdsButton>
        </div>
      </form>
    </UdsCard>
  );
};
