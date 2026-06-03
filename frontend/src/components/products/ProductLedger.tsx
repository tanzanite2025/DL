import React from 'react';
import { UdsCard, UdsButton } from '../uds/UdsComponents';
import { useI18n } from '../../i18n/I18nContext';
import { Item } from '../../types';
import { Package, Trash2, Edit3 } from 'lucide-react';

interface ProductLedgerProps {
  materials: Item[];
  products: Item[];
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
  onOpenBomModal: () => void;
}

export const ProductLedger: React.FC<ProductLedgerProps> = ({
  materials,
  products,
  onEdit,
  onDelete,
  onOpenBomModal,
}) => {
  const { t } = useI18n();

  return (
    <div className="lg:col-span-7 flex flex-col gap-8">
      {/* 原材料账册 */}
      <UdsCard title={t('registeredProductLedger') || '原材料/零部件账册'}>
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
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                  成本/单价
                </th>
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                  {t('actionsColumn')}
                </th>
              </tr>
            </thead>
            <tbody>
              {materials.map((item) => (
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
                  <td className="py-3.5 text-right font-mono text-sm font-bold text-neutral-200">
                    {item.currency?.symbol}
                    {item.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <UdsButton
                        variant="ghost"
                        className="h-7 w-7 !p-0 rounded-full border-none text-neutral-400 hover:text-white"
                        onClick={() => onEdit(item)}
                      >
                        <Edit3 size={11} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-7 w-7 !p-0 rounded-full border-none text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 size={11} />
                      </UdsButton>
                    </div>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                    暂无原材料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </UdsCard>

      {/* BOM 成品账册 */}
      <UdsCard
        title={'BOM 成品账册'}
        action={
          <UdsButton
            variant="ghost"
            className="h-7 px-3 text-[10px] font-black uppercase"
            onClick={onOpenBomModal}
          >
            {t('configureBom')}
          </UdsButton>
        }
      >
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
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                  组合成本
                </th>
                <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                  {t('actionsColumn')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs"
                >
                  <td className="py-3.5 pl-2 font-mono font-bold text-neutral-200">
                    <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[8px] font-black bg-blue-500/10 text-blue-400 mr-2 border border-blue-500/20">
                      BOM
                    </div>
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
                  <td className="py-3.5 text-right font-mono text-sm font-bold text-emerald-400">
                    {item.currency?.symbol}
                    {item.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <UdsButton
                        variant="ghost"
                        className="h-7 w-7 !p-0 rounded-full border-none text-neutral-400 hover:text-white"
                        onClick={() => onEdit(item)}
                      >
                        <Edit3 size={11} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-7 w-7 !p-0 rounded-full border-none text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 size={11} />
                      </UdsButton>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                    暂无 BOM 成品
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </UdsCard>
    </div>
  );
};
