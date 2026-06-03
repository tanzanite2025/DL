import React, { useState, useEffect } from 'react';
import { UdsCard, UdsButton, UdsInput } from '../components/uds/UdsComponents';
import { useI18n } from '../i18n/I18nContext';
import { Box, Package, Plus, Trash2, Play, RotateCcw } from 'lucide-react';
import { ShowToast } from '../types';
import { useItems } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { bomApi, assemblyApi } from '../services/api';

interface AssemblyManagementProps {
  token: string;
  showToast: ShowToast;
}

interface BomComponent {
  componentItemId: string;
  componentItem: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  quantity: number;
  remarks?: string;
}

interface AssemblyLog {
  id: string;
  type: 'ASSEMBLE' | 'DISASSEMBLE';
  assembledItem: {
    name: string;
    code: string;
  };
  quantity: number;
  totalCost: number;
  warehouse: {
    name: string;
  };
  user: {
    username: string;
  };
  remarks?: string;
  createdAt: string;
}

export const AssemblyManagement: React.FC<AssemblyManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { items } = useItems();
  const { warehouses } = useWarehouses();

  // 当前选中的 Tab
  const [activeTab, setActiveTab] = useState<'bom' | 'assembly' | 'history'>('bom');

  // BOM 配置相关状态
  const [bomProducts, setBomProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bomComponents, setBomComponents] = useState<BomComponent[]>([]);
  const [newComponentId, setNewComponentId] = useState('');
  const [newComponentQty, setNewComponentQty] = useState('1');
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [isSavingBom, setIsSavingBom] = useState(false);

  // 组装操作相关状态
  const [assemblyItemId, setAssemblyItemId] = useState('');
  const [assemblyQty, setAssemblyQty] = useState('1');
  const [assemblyWarehouseId, setAssemblyWarehouseId] = useState('');
  const [assemblyRemarks, setAssemblyRemarks] = useState('');
  const [isAssembling, setIsAssembling] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState<any>(null);

  // 组装历史相关状态
  const [assemblyLogs, setAssemblyLogs] = useState<AssemblyLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // 获取已配置 BOM 的产品列表
  const loadBomProducts = async () => {
    try {
      const products = await bomApi.list();
      setBomProducts(products);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  // 获取指定产品的 BOM 配置
  const loadBomComponents = async (productId: string) => {
    if (!productId) return;
    setIsLoadingBom(true);
    try {
      const components = await bomApi.getByItemId(productId);
      setBomComponents(components);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsLoadingBom(false);
    }
  };

  // 保存 BOM 配置
  const handleSaveBom = async () => {
    if (!selectedProductId) {
      showToast(t('selectProduct'), 'error');
      return;
    }

    setIsSavingBom(true);
    try {
      const componentsData = bomComponents.map(c => ({
        componentItemId: c.componentItemId,
        quantity: c.quantity,
        remarks: c.remarks || ''
      }));

      await bomApi.save({
        parentItemId: selectedProductId,
        components: componentsData
      });

      showToast(t('bomSaveSuccess'), 'success');
      loadBomProducts();
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsSavingBom(false);
    }
  };

  // 添加零件到 BOM
  const handleAddComponent = () => {
    if (!newComponentId) {
      showToast(t('selectItem'), 'error');
      return;
    }

    const qty = parseInt(newComponentQty);
    if (isNaN(qty) || qty <= 0) {
      showToast(t('errMovementFormInvalid'), 'error');
      return;
    }

    // 检查是否已存在
    if (bomComponents.some(c => c.componentItemId === newComponentId)) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }

    const item = items.find(i => i.id === newComponentId);
    if (!item) return;

    setBomComponents([
      ...bomComponents,
      {
        componentItemId: item.id,
        componentItem: item,
        quantity: qty
      }
    ]);

    setNewComponentId('');
    setNewComponentQty('1');
  };

  // 删除 BOM 中的零件
  const handleRemoveComponent = (componentId: string) => {
    setBomComponents(bomComponents.filter(c => c.componentItemId !== componentId));
  };

  // 检查库存
  const handleCheckStock = async () => {
    if (!assemblyItemId || !assemblyWarehouseId) {
      showToast(t('errItemFormRequired'), 'error');
      return;
    }

    const qty = parseInt(assemblyQty);
    if (isNaN(qty) || qty <= 0) {
      showToast(t('errMovementFormInvalid'), 'error');
      return;
    }

    try {
      const result = await assemblyApi.check({
        assembledItemId: assemblyItemId,
        quantity: qty,
        warehouseId: assemblyWarehouseId
      });
      setStockCheckResult(result);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  // 执行组装
  const handleAssemble = async () => {
    if (!assemblyItemId || !assemblyWarehouseId) {
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
      await assemblyApi.assemble({
        assembledItemId: assemblyItemId,
        quantity: qty,
        warehouseId: assemblyWarehouseId,
        remarks: assemblyRemarks
      });

      showToast(t('assembleSuccess'), 'success');
      setStockCheckResult(null);
      setAssemblyQty('1');
      setAssemblyRemarks('');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsAssembling(false);
    }
  };

  // 执行拆解
  const handleDisassemble = async () => {
    if (!assemblyItemId || !assemblyWarehouseId) {
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
      await assemblyApi.disassemble({
        assembledItemId: assemblyItemId,
        quantity: qty,
        warehouseId: assemblyWarehouseId,
        remarks: assemblyRemarks
      });

      showToast(t('disassembleSuccess'), 'success');
      setStockCheckResult(null);
      setAssemblyQty('1');
      setAssemblyRemarks('');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsAssembling(false);
    }
  };

  // 加载组装历史
  const loadAssemblyLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await assemblyApi.listLogs();
      setAssemblyLogs(logs);
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (activeTab === 'bom') {
      loadBomProducts();
    } else if (activeTab === 'history') {
      loadAssemblyLogs();
    }
  }, [activeTab]);

  // 当选择的产品变化时，加载 BOM
  useEffect(() => {
    if (selectedProductId) {
      loadBomComponents(selectedProductId);
    } else {
      setBomComponents([]);
    }
  }, [selectedProductId]);

  // 设置默认仓库
  useEffect(() => {
    if (warehouses.length > 0 && !assemblyWarehouseId) {
      setAssemblyWarehouseId(warehouses[0].id);
    }
  }, [warehouses]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Tab 切换 */}
      <div className="flex items-center gap-2 bg-black/40 p-1 rounded-full w-fit">
        <button
          onClick={() => setActiveTab('bom')}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'bom'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Package size={12} className="inline mr-1.5" />
          {t('bomConfig')}
        </button>
        <button
          onClick={() => setActiveTab('assembly')}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'assembly'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Box size={12} className="inline mr-1.5" />
          {t('assemblyOperation')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'history'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <RotateCcw size={12} className="inline mr-1.5" />
          {t('assemblyHistory')}
        </button>
      </div>

      {/* BOM 配置 Tab */}
      {activeTab === 'bom' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：配置表单 */}
          <div className="lg:col-span-5">
            <UdsCard title={t('configureBom')}>
              <div className="flex flex-col gap-4">
                {/* 选择成品 */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                    {t('selectProduct')}
                  </label>
                  <select
                    className="w-full h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">{t('selectProduct')}</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id} className="bg-[#121214] text-white">
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProductId && (
                  <>
                    {/* 添加零件 */}
                    <div className="border-t border-white/5 pt-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                        {t('addComponent')}
                      </label>
                      <div className="flex gap-2">
                        <select
                          className="flex-1 h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                          value={newComponentId}
                          onChange={(e) => setNewComponentId(e.target.value)}
                        >
                          <option value="">{t('componentItem')}</option>
                          {items
                            .filter(i => !bomComponents.some(c => c.componentItemId === i.id))
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
                          onChange={(e) => setNewComponentQty(e.target.value)}
                          placeholder={t('requiredQty')}
                          className="w-24"
                        />
                        <UdsButton onClick={handleAddComponent} variant="ghost">
                          <Plus size={14} />
                        </UdsButton>
                      </div>
                    </div>

                    {/* 零件列表 */}
                    {isLoadingBom ? (
                      <div className="text-center py-4 text-[10px] text-neutral-500">
                        {t('loading')}
                      </div>
                    ) : bomComponents.length > 0 ? (
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
                              <div className="text-[10px] text-neutral-500 font-mono">
                                {comp.componentItem.code}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-neutral-300 mr-3">
                              × {comp.quantity}
                            </div>
                            <UdsButton
                              variant="ghost"
                              className="h-7 w-7 !p-0 rounded-full text-rose-500 hover:text-rose-400"
                              onClick={() => handleRemoveComponent(comp.componentItemId)}
                            >
                              <Trash2 size={11} />
                            </UdsButton>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-[10px] text-neutral-600">
                        {t('noBomComponents')}
                      </div>
                    )}

                    {/* 保存按钮 */}
                    <div className="border-t border-white/5 pt-4">
                      <UdsButton
                        variant="primary"
                        className="w-full"
                        onClick={handleSaveBom}
                        disabled={isSavingBom || bomComponents.length === 0}
                      >
                        {isSavingBom ? t('loading') : t('save')}
                      </UdsButton>
                    </div>
                  </>
                )}
              </div>
            </UdsCard>
          </div>

          {/* 右侧：已配置 BOM 的产品列表 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('registeredProductLedger')}>
              <div className="overflow-x-auto">
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
                        {t('bomComponents')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs cursor-pointer"
                        onClick={() => setSelectedProductId(product.id)}
                      >
                        <td className="py-3.5 pl-2 font-mono font-bold text-neutral-200">
                          {product.code}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                            <Package size={13} className="text-neutral-400" />
                            <span>{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-center font-bold text-neutral-400">
                          {product.bomComponents?.length || 0}
                        </td>
                      </tr>
                    ))}
                    {bomProducts.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-[10px] font-mono text-neutral-600">
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
      )}

      {/* 组装操作 Tab */}
      {activeTab === 'assembly' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：操作表单 */}
          <div className="lg:col-span-5">
            <UdsCard title={t('assemblyOperation')}>
              <div className="flex flex-col gap-4">
                {/* 选择成品 */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                    {t('selectProduct')}
                  </label>
                  <select
                    className="w-full h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                    value={assemblyItemId}
                    onChange={(e) => {
                      setAssemblyItemId(e.target.value);
                      setStockCheckResult(null);
                    }}
                  >
                    <option value="">{t('selectProduct')}</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id} className="bg-[#121214] text-white">
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 选择仓库 */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                    {t('warehouseName')}
                  </label>
                  <select
                    className="w-full h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                    value={assemblyWarehouseId}
                    onChange={(e) => {
                      setAssemblyWarehouseId(e.target.value);
                      setStockCheckResult(null);
                    }}
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} className="bg-[#121214] text-white">
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 数量 */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                    {t('assemblyQty')}
                  </label>
                  <UdsInput
                    type="number"
                    min="1"
                    value={assemblyQty}
                    onChange={(e) => {
                      setAssemblyQty(e.target.value);
                      setStockCheckResult(null);
                    }}
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

                {/* 检查库存按钮 */}
                <div className="border-t border-white/5 pt-4">
                  <UdsButton
                    variant="ghost"
                    className="w-full"
                    onClick={handleCheckStock}
                  >
                    {t('stockCheck')}
                  </UdsButton>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <UdsButton
                    variant="primary"
                    className="flex-1"
                    onClick={handleAssemble}
                    disabled={isAssembling || !stockCheckResult?.canAssemble}
                  >
                    <Play size={12} className="mr-1.5" />
                    {isAssembling ? t('loading') : t('executeAssembly')}
                  </UdsButton>
                  <UdsButton
                    variant="ghost"
                    className="flex-1"
                    onClick={handleDisassemble}
                    disabled={isAssembling}
                  >
                    <RotateCcw size={12} className="mr-1.5" />
                    {t('executeDisassembly')}
                  </UdsButton>
                </div>
              </div>
            </UdsCard>
          </div>

          {/* 右侧：库存检查结果 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('stockCheck')}>
              {stockCheckResult ? (
                <div className="space-y-3">
                  {/* 总体状态 */}
                  <div className={`p-4 rounded-2xl ${stockCheckResult.canAssemble ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                    <div className="text-sm font-black uppercase tracking-wider">
                      {stockCheckResult.canAssemble ? (
                        <span className="text-emerald-400">{t('stockSufficient')}</span>
                      ) : (
                        <span className="text-rose-400">{t('stockInsufficient')}</span>
                      )}
                    </div>
                  </div>

                  {/* 零件明细 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-solid border-white/10">
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                            {t('componentItem')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                            {t('needColumn')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                            {t('stockColumn')}
                          </th>
                          <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                            {t('statusCol')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockCheckResult.stockCheck.map((check: any) => (
                          <tr key={check.componentItem.id} className="border-b border-solid border-white/5 text-xs">
                            <td className="py-3 pl-2 font-semibold text-neutral-200">
                              {check.componentItem.name}
                            </td>
                            <td className="py-3 text-center font-bold text-neutral-300">
                              {check.requiredQty}
                            </td>
                            <td className="py-3 text-center font-bold text-neutral-300">
                              {check.currentStock}
                            </td>
                            <td className="py-3 text-center">
                              {check.sufficient ? (
                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                                  {t('stockSufficient')}
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-rose-500/10 text-rose-400">
                                  {t('stockInsufficient')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-[10px] text-neutral-600">
                  {t('errNoBomConfigured')}
                </div>
              )}
            </UdsCard>
          </div>
        </div>
      )}

      {/* 组装历史 Tab */}
      {activeTab === 'history' && (
        <UdsCard title={t('assemblyHistory')}>
          {isLoadingLogs ? (
            <div className="text-center py-8 text-[10px] text-neutral-500">
              {t('loading')}
            </div>
          ) : assemblyLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                      {t('dateCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('typeCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('itemNameCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                      {t('qtyCol')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('warehouseName')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('op')}
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                      {t('remarks')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assemblyLogs.map((log) => (
                    <tr key={log.id} className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs">
                      <td className="py-3.5 pl-2 font-mono text-[10px] text-neutral-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5">
                        {log.type === 'ASSEMBLE' ? (
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                            {t('typeAssemble')}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
                            {t('typeDisassemble')}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-neutral-200">{log.assembledItem.name}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{log.assembledItem.code}</div>
                      </td>
                      <td className="py-3.5 text-center font-bold text-neutral-300">
                        {log.quantity}
                      </td>
                      <td className="py-3.5 text-neutral-300">
                        {log.warehouse.name}
                      </td>
                      <td className="py-3.5 text-neutral-400 font-mono text-[10px]">
                        {log.user.username}
                      </td>
                      <td className="py-3.5 text-neutral-500 text-[10px]">
                        {log.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-[10px] font-mono text-neutral-600">
              {t('noMovesLogged')}
            </div>
          )}
        </UdsCard>
      )}
    </div>
  );
};
