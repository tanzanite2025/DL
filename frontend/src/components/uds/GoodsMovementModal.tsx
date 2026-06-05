import React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { ShowToast } from '../../types';
import { GoodsMovementForm } from './GoodsMovementForm';

interface GoodsMovementModalProps {
  isOpen: boolean;
  showToast: ShowToast;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoodsMovementModal: React.FC<GoodsMovementModalProps> = ({
  isOpen,
  showToast,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-full w-[85vw] max-w-7xl h-[80vh] flex flex-col animate-uds-fade">
        <GoodsMovementForm
          className="h-full flex flex-col [&>div:last-child]:flex-1 [&>div:last-child]:flex [&>div:last-child]:flex-col [&>div:last-child]:overflow-hidden"
          showToast={showToast}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
          action={
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white shrink-0 cursor-pointer p-1.5 rounded-full hover:bg-white/5 transition-all text-xs"
              title={t('cancel')}
            >
              <X size={14} />
            </button>
          }
        />
      </div>
    </div>
  );
};
