import React from 'react';
import { ProductFormPanel } from './ProductFormPanel';
import type { Unit } from '../../hooks/useUnits';
import type { Currency } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
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
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
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
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl">
        <ProductFormPanel
          editingItemId={editingItemId}
          itemCode={itemCode}
          itemName={itemName}
          itemUnit={itemUnit}
          itemDescription={itemDescription}
          itemCost={itemCost}
          itemCurrencyId={itemCurrencyId}
          units={units}
          currencies={currencies}
          onItemCodeChange={onItemCodeChange}
          onItemNameChange={onItemNameChange}
          onItemUnitChange={onItemUnitChange}
          onItemDescriptionChange={onItemDescriptionChange}
          onItemCostChange={onItemCostChange}
          onItemCurrencyIdChange={onItemCurrencyIdChange}
          onSubmit={onSubmit}
          onCancel={onClose}
          showCancelAction
        />
      </div>
    </div>
  );
};
