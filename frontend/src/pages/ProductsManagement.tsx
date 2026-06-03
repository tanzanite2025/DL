import React, { useState } from 'react';
import { UdsHeader, UdsButton } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useI18n } from '../i18n/I18nContext';
import { Item, ShowToast } from '../types';
import { useItems } from '../hooks/useItems';
import { useUnits } from '../hooks/useUnits';
import { useCurrencies } from '../hooks/useCurrencies';
import { bomApi } from '../services/api';
import { ProductFormPanel } from '../components/products/ProductFormPanel';
import { ProductLedger } from '../components/products/ProductLedger';
import { BomConfigModal } from '../components/products/BomConfigModal';


interface ProductsManagementProps {
  token: string;
  showToast: ShowToast;
}

interface BomComponent {
  componentItemId: string;
  componentItem: Item;
  quantity: number;
  remarks?: string;
}

export const ProductsManagement: React.FC<ProductsManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { items, isLoading, createItem, updateItem, deleteItem } = useItems();
  const { units } = useUnits();
  const { currencies } = useCurrencies();
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // 表单状态
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('件');
  const [itemDescription, setItemDescription] = useState('');
  const [itemCost, setItemCost] = useState('0');
  const [itemCurrencyId, setItemCurrencyId] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // BOM 配置状态（仅用于新建 BOM 成品）
  const [bomComponents, setBomComponents] = useState<BomComponent[]>([]);
  const [isSavingBom, setIsSavingBom] = useState(false);
  const [newComponentId, setNewComponentId] = useState('');
  const [newComponentQty, setNewComponentQty] = useState('1');

  // BOM 成品创建弹窗状态
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [newBomName, setNewBomName] = useState('');
  const [newBomUnit, setNewBomUnit] = useState('件');
  const [newBomDesc, setNewBomDesc] = useState('');
  const [newBomCurrencyId, setNewBomCurrencyId] = useState('');

  // 登记或更新物料商品
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemUnit.trim() || !itemCurrencyId) {
      showToast('请输入必填信息并选择币种', 'error');
      return;
    }

    const payload: any = {
      name: itemName.trim(),
      unit: itemUnit.trim(),
      description: itemDescription.trim() || null,
      cost: parseFloat(itemCost) || 0,
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
          cost: parseFloat(itemCost) || 0,
          currencyId: itemCurrencyId
        });
      } else {
        await createItem({
          name: itemName.trim(),
          unit: itemUnit.trim(),
          description: itemDescription.trim() || undefined,
          cost: parseFloat(itemCost) || 0,
          currencyId: itemCurrencyId,
          type: 'MATERIAL'
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
      setItemCost('0');
      setItemCurrencyId('');
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
    setItemCost(item.cost != null ? String(item.cost) : '0');
    // setItemCurrencyId(item.currencyId || ''); // 物料币种暂不参与类型系统
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingItemId(null);
    setItemCode('');
    setItemName('');
    setItemUnit('件');
    setItemDescription('');
    setItemCost('0');
    // setItemCurrencyId('');
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

  // 添加 BOM 零件（仅用于新建 BOM 成品时在弹窗中配置清单）
  const handleAddBomComponent = () => {
    if (!newComponentId) {
      showToast(t('selectItem'), 'error');
      return;
    }

    const qty = parseInt(newComponentQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast(t('errMovementFormInvalid'), 'error');
      return;
    }

    if (bomComponents.some((c) => c.componentItemId === newComponentId)) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }

    const item = items.find((i) => i.id === newComponentId);
    if (!item) return;

    setBomComponents([
      ...bomComponents,
      {
        componentItemId: item.id,
        componentItem: item,
        quantity: qty,
      },
    ]);

    setNewComponentId('');
    setNewComponentQty('1');
  };

  // 删除 BOM 零件
  const handleRemoveBomComponent = (componentItemId: string) => {
    setBomComponents(bomComponents.filter((c) => c.componentItemId !== componentItemId));
  };

  // 保存 BOM
  const handleSaveBom = async () => {
    if (bomComponents.length === 0 || !newBomCurrencyId) {
      showToast('缺少 BOM 零件或未选择币种', 'error');
      return;
    }

    setIsSavingBom(true);
    try {
      // 先根据用户输入创建一个新的 BOM 成品物料，成本按物料成本 * 数量汇总
      const bomCost = bomComponents.reduce((sum, comp) => {
        const c = comp.componentItem.cost ?? 0;
        return sum + c * comp.quantity;
      }, 0);

      const newItem: any = await createItem({
        name: newBomName.trim(),
        unit: newBomUnit.trim() || '件',
        description: newBomDesc.trim() || undefined,
        cost: bomCost,
        currencyId: newBomCurrencyId,
        type: 'PRODUCT',
      });

      const parentItemId = newItem?.id as string | undefined;

      const componentsData = bomComponents.map((c) => ({
        componentItemId: c.componentItemId,
        quantity: c.quantity,
        remarks: c.remarks || '',
      }));

      await bomApi.save({
        parentItemId: parentItemId!,
        components: componentsData,
      });

      showToast(t('bomSaveSuccess'), 'success');
      // 重置表单
      setNewBomName('');
      setNewBomUnit('件');
      setNewBomDesc('');
      setNewBomCurrencyId('');
      setBomComponents([]);
      setNewComponentId('');
      setNewComponentQty('1');
      setIsBomModalOpen(false);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsSavingBom(false);
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

  // 计算 BOM 成分的成本总和（按币种分类）
  const bomCostSummary = bomComponents.reduce((acc, comp) => {
    const symbol = comp.componentItem.currency?.symbol || '¥';
    const cost = (comp.componentItem.cost || 0) * comp.quantity;
    if (!acc[symbol]) {
      acc[symbol] = 0;
    }
    acc[symbol] += cost;
    return acc;
  }, {} as Record<string, number>);

  const materials = items.filter(i => i.type !== 'PRODUCT');
  const products = items.filter(i => i.type === 'PRODUCT');

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* 页眉 - 已隐藏（保留代码便于定位） */}
      <UdsHeader
        className="hidden"
        title={t('productsHeader')}
        description={t('productsDesc')}
      />

      <div className="flex justify-end">
        <UdsButton variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => setIsAuditOpen(true)}>
          审计日志
        </UdsButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：产品表单 */}
        <div className="lg:col-span-5">
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
            onItemCodeChange={setItemCode}
            onItemNameChange={setItemName}
            onItemUnitChange={setItemUnit}
            onItemDescriptionChange={setItemDescription}
            onItemCostChange={setItemCost}
            onItemCurrencyIdChange={setItemCurrencyId}
            onSubmit={handleSaveItem}
            onCancel={cancelEdit}
          />
        </div>
 
        {/* 右侧：列表账册 */}
        <ProductLedger
          materials={materials}
          products={products}
          onEdit={startEdit}
          onDelete={handleDelete}
          onOpenBomModal={() => setIsBomModalOpen(true)}
        />
      </div>
      

      <BomConfigModal
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        bomComponents={bomComponents}
        newComponentId={newComponentId}
        newComponentQty={newComponentQty}
        newBomName={newBomName}
        newBomUnit={newBomUnit}
        newBomDesc={newBomDesc}
        newBomCurrencyId={newBomCurrencyId}
        items={items}
        units={units}
        currencies={currencies}
        bomCostSummary={bomCostSummary}
        isSaving={isSavingBom}
        onBomNameChange={setNewBomName}
        onBomUnitChange={setNewBomUnit}
        onBomDescChange={setNewBomDesc}
        onBomCurrencyIdChange={setNewBomCurrencyId}
        onComponentIdChange={setNewComponentId}
        onComponentQtyChange={setNewComponentQty}
        onAddComponent={handleAddBomComponent}
        onRemoveComponent={handleRemoveBomComponent}
        onSaveBom={handleSaveBom}
      />
      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="items"
        title={'物料/产品审计'}
      />
    </div>
  );
};
