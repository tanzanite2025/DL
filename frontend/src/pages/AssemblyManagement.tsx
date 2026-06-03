import React, { useState, useEffect } from 'react';
import { UdsCard, UdsButton, UdsInput } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useI18n } from '../i18n/I18nContext';
import { Box, Play, RotateCcw } from 'lucide-react';
import { ShowToast } from '../types';
import { useWarehouses } from '../hooks/useWarehouses';
import { useCurrencies } from '../hooks/useCurrencies';
import { assemblyApi } from '../services/api';

interface AssemblyManagementProps {
  token: string;
  showToast: ShowToast;
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
  user: {
    username: string;
  };
  currency?: {
    symbol: string;
  };
  remarks?: string;
  createdAt: string;
}

export const AssemblyManagement: React.FC<AssemblyManagementProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { items } = useItems();
  const { warehouses } = useWarehouses();
  const { currencies } = useCurrencies();

  // 当前选中的 Tab
  const [activeTab, setActiveTab] = useState<'assembly' | 'history'>('assembly');
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // 组装操作相关状态
  const [assemblyItemId, setAssemblyItemId] = useState('');
  const [assemblyQty, setAssemblyQty] = useState('1');
  const [assemblyWarehouseId, setAssemblyWarehouseId] = useState('');
  const [assemblyCurrencyId, setAssemblyCurrencyId] = useState('');
  const [assemblyRemarks, setAssemblyRemarks] = useState('');
  const [isAssembling, setIsAssembling] = useState(false);
  const [stockCheckResult, setStockCheckResult] = useState<any>(null);

  // 组装历史相关状态
  const [assemblyLogs, setAssemblyLogs] = useState<AssemblyLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
    if (!assemblyItemId || !assemblyWarehouseId || !assemblyCurrencyId) {
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
        currencyId: assemblyCurrencyId,
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
    if (!assemblyItemId || !assemblyWarehouseId || !assemblyCurrencyId) {
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
        currencyId: assemblyCurrencyId,
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
    if (activeTab === 'history') {
      loadAssemblyLogs();
    }
  }, [activeTab]);

  // 设置默认仓库
  useEffect(() => {
    if (warehouses.length > 0 && !assemblyWarehouseId) {
      setAssemblyWarehouseId(warehouses[0].id);
    }
  }, [warehouses]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {/* Tab 切换（仅组装 & 历史） */}
      <div className="flex items-center gap-2 bg-black/40 p-1 rounded-full w-fit">
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

      <div className="flex justify-end">
        <UdsButton variant="ghost" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => setIsAuditOpen(true)}>
          审计日志
        </UdsButton>
      </div>


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

                {/* 币种 */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                    币种
                  </label>
                  <select
                    className="w-full h-11 px-4 rounded-2xl border border-white/5 bg-[#1c1c1e]/50 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                    value={assemblyCurrencyId}
                    onChange={(e) => setAssemblyCurrencyId(e.target.value)}
                  >
                    <option value="">选择币种</option>
                    {currencies.map((cur) => (
                      <option key={cur.id} value={cur.id} className="bg-[#121214] text-white">
                        {cur.name} ({cur.symbol})
                      </option>
                    ))}
                  </select>
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
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                      成本
                    </th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
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
                      <td className="py-3.5 text-right font-mono text-sm font-bold text-neutral-200">
                        {log.currency?.symbol}{log.totalCost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-neutral-400 font-mono text-[10px] pl-2">
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
      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="assembly"
        title={'装配审计'}
      />
    </div>
  );
};
