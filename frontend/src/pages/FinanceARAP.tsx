import React, { useState } from 'react';
import { UdsHeader, UdsCard, UdsButton, UdsInput, UdsSelect, UdsBadge, UdsProgressBar } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useI18n } from '../i18n/I18nContext';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Trash2, Edit3, CreditCard, Coins } from 'lucide-react';
import { PaymentAccount, Currency, ShowToast } from '../types';
import { useFinance } from '../hooks/useFinance';
import { useCurrencies } from '../hooks/useCurrencies';

interface FinanceARAPProps {
  token: string;
  showToast: ShowToast;
}

export const FinanceARAP: React.FC<FinanceARAPProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const { bills, accounts, isLoading: financeLoading, createBill, payBill, deleteBill, createAccount, updateAccount, deleteAccount } = useFinance();
  const { currencies, isLoading: curLoading, createCurrency, updateCurrency, deleteCurrency } = useCurrencies();
  const [activeTab, setActiveTab] = useState<'ledger' | 'accounts' | 'currencies'>('ledger');
  const isLoading = financeLoading || curLoading;
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // 新增账单表单
  const [formType, setFormType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [formAmount, setFormAmount] = useState('');
  const [formPartner, setFormPartner] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCurrencyId, setFormCurrencyId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 账单核销表单
  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // 支付账户表单
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('');
  const [accNo, setAccNo] = useState('');
  const [accHolder, setAccHolder] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accCurrencyId, setAccCurrencyId] = useState('');
  const [editingAccId, setEditingAccId] = useState<string | null>(null);

  // 货币表单
  const [curCode, setCurCode] = useState('');
  const [curName, setCurName] = useState('');
  const [curSymbol, setCurSymbol] = useState('');
  const [curIsDefault, setCurIsDefault] = useState(false);
  const [editingCurId, setEditingCurId] = useState<string | null>(null);

  // 新增账单
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formAmount);

    if (isNaN(amountVal) || amountVal <= 0) {
      showToast(t('errBillAmountPositive'), 'error');
      return;
    }
    if (!formPartner.trim() || !formDueDate || !formCurrencyId) {
      showToast(t('errBillRequired'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBill({
        type: formType,
        amount: amountVal,
        currencyId: formCurrencyId,
        partner: formPartner,
        description: formDescription,
        dueDate: formDueDate
      });

      showToast(t('billCreatedSuccess'), 'success');
      setFormAmount('');
      setFormPartner('');
      setFormDescription('');
      setFormDueDate('');
      setFormCurrencyId('');
    } catch (error: any) {
      showToast(error.message || t('errBillRecordFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 核销账单 (付款/收款登记)
  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBillId) return;

    const payVal = parseFloat(payAmount);
    if (isNaN(payVal) || payVal <= 0) {
      showToast(t('errWriteOffAmountPositive'), 'error');
      return;
    }

    const targetBill = bills.find(b => b.id === payingBillId);
    if (!targetBill) return;

    const remaining = targetBill.amount - targetBill.paidAmount;
    if (payVal > remaining) {
      showToast(`${t('errWriteOffExceedsRemaining')} (${remaining.toFixed(2)})`, 'error');
      return;
    }

    try {
      await payBill(payingBillId, { payAmount: payVal, accountId: selectedAccountId || undefined });

      const activeAccName = accounts.find(a => a.id === selectedAccountId)?.name || t('noAccountSpecified');
      showToast(`${t('writeOffSuccess')}${activeAccName}`, 'success');
      setPayingBillId(null);
      setPayAmount('');
      setSelectedAccountId('');
    } catch (error: any) {
      showToast(error.message || t('errBillWriteOffFailed'), 'error');
    }
  };

  // 删除账单
  const handleDeleteBill = async (id: string) => {
    if (!window.confirm(t('billDeleteConfirm'))) {
      return;
    }

    try {
      await deleteBill(id);
      showToast(t('billDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errBillVoidFailed'), 'error');
    }
  };

  // 保存收款账户（添加或编辑）
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accNo.trim() || !accCurrencyId) {
      showToast('请填写账户名称、账号及账户币种', 'error');
      return;
    }

    try {
      if (editingAccId) {
        await updateAccount(editingAccId, { name: accName, type: accType, accountNo: accNo, holder: accHolder, currencyId: accCurrencyId });
        showToast(t('accUpdatedSuccess'), 'success');
      } else {
        await createAccount({ name: accName, type: accType, accountNo: accNo, holder: accHolder, balance: accBalance, currencyId: accCurrencyId });
        showToast(t('accCreatedSuccess'), 'success');
      }
      setAccName('');
      setAccType('WECHAT');
      setAccNo('');
      setAccHolder('');
      setAccBalance('');
      setAccCurrencyId('');
      setEditingAccId(null);
    } catch (error: any) {
      showToast(error.message || t('errAccSaveFailed'), 'error');
    }
  };

  // 触发编辑账户
  const startEditAccount = (acc: PaymentAccount) => {
    setAccName(acc.name);
    setAccType(acc.type);
    setAccNo(acc.accountNo);
    setAccHolder(acc.holder || '');
    setAccBalance(''); // 编辑时不修改初始余额
    setAccCurrencyId(acc.currencyId);
    setEditingAccId(acc.id);
  };

  // 取消编辑账户
  const cancelEditAccount = () => {
    setEditingAccId(null);
    setAccName('');
    setAccType('WECHAT');
    setAccNo('');
    setAccHolder('');
  };

  // 保存货币（添加或编辑）
  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curCode.trim() || !curName.trim() || !curSymbol.trim()) {
      showToast(t('errCurrencyRequired'), 'error');
      return;
    }

    const payload = {
      code: curCode.trim().toUpperCase(),
      name: curName.trim(),
      symbol: curSymbol.trim(),
      isDefault: curIsDefault
    };

    try {
      if (editingCurId) {
        await updateCurrency(editingCurId, payload);
      } else {
        await createCurrency(payload);
      }

      showToast(editingCurId ? t('currencyUpdatedSuccess') : t('currencyCreatedSuccess'), 'success');
      setCurCode('');
      setCurName('');
      setCurSymbol('');
      setCurIsDefault(false);
      setEditingCurId(null);
    } catch (error: any) {
      showToast(error.message || t('errCurrencySaveFailed'), 'error');
    }
  };

  // 触发编辑货币
  const startEditCurrency = (cur: Currency) => {
    setEditingCurId(cur.id);
    setCurCode(cur.code);
    setCurName(cur.name);
    setCurSymbol(cur.symbol);
    setCurIsDefault(cur.isDefault);
  };

  // 取消编辑货币
  const cancelEditCurrency = () => {
    setEditingCurId(null);
    setCurCode('');
    setCurName('');
    setCurSymbol('');
    setCurIsDefault(false);
  };

  // 删除货币
  const handleDeleteCurrency = async (id: string) => {
    if (!window.confirm(t('currencyDeleteConfirm'))) {
      return;
    }

    try {
      await deleteCurrency(id);
      showToast(t('currencyDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errCurrencyDeleteFailed'), 'error');
    }
  };

  // 删除账户
  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm(t('accDeleteConfirm'))) {
      return;
    }

    try {
      await deleteAccount(id);
      showToast(t('accDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  // 计算统计概要 (按币种分组)
  const summariesByCurrency = bills.reduce((acc, bill) => {
    const curId = bill.currencyId || 'unknown';
    if (!acc[curId]) {
      acc[curId] = {
        symbol: bill.currency?.symbol || '',
        arTotal: 0, arPaid: 0, arPending: 0, apTotal: 0, apPaid: 0, apPending: 0
      };
    }
    const remaining = bill.amount - bill.paidAmount;
    if (bill.type === 'RECEIVABLE') {
      acc[curId].arTotal += bill.amount;
      acc[curId].arPaid += bill.paidAmount;
      acc[curId].arPending += remaining;
    } else {
      acc[curId].apTotal += bill.amount;
      acc[curId].apPaid += bill.paidAmount;
      acc[curId].apPending += remaining;
    }
    return acc;
  }, {} as Record<string, { symbol: string, arTotal: number, arPaid: number, arPending: number, apTotal: number, apPaid: number, apPending: number }>);

  if (isLoading && bills.length === 0) {
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
        title={t('financeHeader')}
        description={t('financeDesc')}
      />

      {/* 双页签切换选项卡 rounded-[24px] 契合 UDS 1.0 */}
      <div className="flex bg-[#121214] p-1.5 rounded-2xl self-start gap-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'ledger'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('transLedgerTab')}
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'accounts'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('paymentAccountsTab')}
        </button>
        <button
          onClick={() => setActiveTab('currencies')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'currencies'
              ? 'bg-white text-black'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('currenciesTab')}
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* 财务看板概要 */}
          <div className="flex flex-col gap-8">
            {Object.entries(summariesByCurrency).map(([curId, summary]) => (
              <div key={curId} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative p-4 rounded-3xl border border-dashed border-white/10 bg-white/5">
                <div className="absolute -top-3 left-6 px-2 bg-[#121214] text-[10px] font-black uppercase tracking-widest text-primary border border-dashed border-primary/30 rounded">
                  {summary.symbol} {t('ledgerCurrency') || '币种账本'}
                </div>
                {/* 应收款卡片 */}
                <UdsCard title={t('arTotal')} className="border-none bg-transparent shadow-none p-0">
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('totalAmount')}</span>
                        <span className="text-lg font-mono font-bold text-white">{summary.symbol}{summary.arTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('receivedAmount')}</span>
                        <span className="text-lg font-mono font-bold text-emerald-500">{summary.symbol}{summary.arPaid.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('pendingRecovery')}</span>
                        <span className="text-lg font-mono font-bold text-amber-500">{summary.symbol}{summary.arPending.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                        <span>{t('recoveryProgress')}</span>
                        <span>{summary.arTotal > 0 ? ((summary.arPaid / summary.arTotal) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <UdsProgressBar value={summary.arPaid} max={summary.arTotal || 1} />
                    </div>
                  </div>
                </UdsCard>

                {/* 应付款卡片 */}
                <UdsCard title={t('apTotal')} className="border-none bg-transparent shadow-none p-0">
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('totalAmount')}</span>
                        <span className="text-lg font-mono font-bold text-white">{summary.symbol}{summary.apTotal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('paidAmount')}</span>
                        <span className="text-lg font-mono font-bold text-emerald-500">{summary.symbol}{summary.apPaid.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">{t('pendingPayment')}</span>
                        <span className="text-lg font-mono font-bold text-rose-500">{summary.symbol}{summary.apPending.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-2">
                      <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                        <span>{t('paymentProgress')}</span>
                        <span>{summary.apTotal > 0 ? ((summary.apPaid / summary.apTotal) * 100).toFixed(1) : 0}%</span>
                      </div>
                      <UdsProgressBar value={summary.apPaid} max={summary.apTotal || 1} />
                    </div>
                  </div>
                </UdsCard>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 左侧：录入账单表单 */}
            <div className="lg:col-span-4 flex flex-col gap-8">
              <UdsCard title={t('recordBill')}>
                <form onSubmit={handleCreateBill} className="flex flex-col gap-4">
                  <UdsSelect
                    label={t('billType')}
                    options={[
                      { value: 'RECEIVABLE', label: t('receivableBill') },
                      { value: 'PAYABLE', label: t('payableBill') }
                    ]}
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'RECEIVABLE' | 'PAYABLE')}
                    disabled={isSubmitting}
                  />
                  <UdsInput
                    label={t('billPartner')}
                    placeholder={t('partnerPlaceholder')}
                    value={formPartner}
                    onChange={(e) => setFormPartner(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <UdsInput
                      label={t('amountLabel')}
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                    <UdsSelect
                      label="币种"
                      options={[
                        { value: '', label: '选择币种' },
                        ...currencies.map(c => ({ value: c.id, label: `${c.name} (${c.symbol})` }))
                      ]}
                      value={formCurrencyId}
                      onChange={(e) => setFormCurrencyId(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <UdsInput
                    label={t('dueDateLabel')}
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <UdsInput
                    label={t('billDesc')}
                    placeholder={t('billRemarksPlaceholder')}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="border-t border-solid border-white/5 pt-4">
                    <UdsButton type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t('transacting') : t('recordBillButton')}
                    </UdsButton>
                  </div>
                </form>
              </UdsCard>
            </div>

            {/* 右侧：账单台账表格 */}
            <div className="lg:col-span-8 flex flex-col gap-8">
              {/* 核销悬浮账卡 */}
              {payingBillId && (() => {
                const bill = bills.find(b => b.id === payingBillId);
                if (!bill) return null;
                const remaining = bill.amount - bill.paidAmount;
                return (
                  <UdsCard
                    title={t('writeOffTitle')}
                    action={
                      <UdsButton variant="ghost" onClick={() => { setPayingBillId(null); setSelectedAccountId(''); }} className="h-7 px-3">
                        {t('cancel')}
                      </UdsButton>
                    }
                    className="border-neutral-500 bg-neutral-900/60"
                  >
                    <form onSubmit={handlePayBill} className="flex flex-col gap-4">
                      <div className="text-[10px] text-neutral-400 font-mono flex flex-col gap-1.5 p-3 rounded-2xl bg-black/30 mb-2">
                        <div>{t('billPartner')}: <span className="text-white font-bold">{bill.partner}</span></div>
                        <div>{t('totalAmount')}: <span className="text-white font-bold">{bill.currency?.symbol}{bill.amount.toFixed(2)}</span></div>
                        <div>{t('receivedAmount')}: <span className="text-emerald-500 font-bold">{bill.currency?.symbol}{bill.paidAmount.toFixed(2)}</span></div>
                        <div>{t('pendingRecovery')}/{t('pendingPayment')}: <span className="text-amber-500 font-bold">{bill.currency?.symbol}{remaining.toFixed(2)}</span></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <UdsInput
                          label={t('writeOffAmount')}
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remaining}
                          placeholder={`Max: ${remaining.toFixed(2)}`}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          required
                        />

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            选择支付账户 (仅限同币种)
                          </label>
                          <select
                            className="w-full h-11 px-4 rounded-2xl border-none bg-neutral-900 text-sm text-white focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            required
                          >
                            <option value="">{t('noAccountSpecified')}</option>
                            {accounts
                              .filter(a => a.currencyId === bill.currencyId)
                              .map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.type}) - 余额: {a.currency?.symbol || ''}{a.balance?.toFixed(2) || '0.00'}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      
                      <UdsButton type="submit" variant="primary" className="w-full">
                        {t('registerWriteOff')}
                      </UdsButton>
                    </form>
                  </UdsCard>
                );
              })()}

              <UdsCard title={t('transLedger')}>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-solid border-white/10">
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">
                          {t('partnerCol')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">
                          {t('billDetailsCol')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">
                          {t('statusCol')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right">
                          {t('amountsCol')}
                        </th>
                        <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">
                          {t('actionsColumn')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => {
                        const isDueOver = new Date(bill.dueDate) < new Date() && bill.status !== 'PAID';
                        return (
                          <tr
                            key={bill.id}
                            className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs"
                          >
                            <td className="py-3.5 pl-2">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {bill.type === 'RECEIVABLE' ? (
                                    <ArrowUpRight size={14} className="text-emerald-500" />
                                  ) : (
                                    <ArrowDownLeft size={14} className="text-rose-500" />
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-neutral-200">{bill.partner}</span>
                                  <span className="text-[8px] font-mono text-neutral-500 uppercase">
                                    {bill.type === 'RECEIVABLE' ? 'RECEIVABLE' : 'PAYABLE'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <div className="flex flex-col">
                                <span className="text-neutral-300">{bill.description || '---'}</span>
                                <span className={`text-[8px] font-mono mt-0.5 ${isDueOver ? 'text-rose-500 font-bold' : 'text-neutral-500'}`}>
                                  DUE: {new Date(bill.dueDate).toLocaleDateString('zh-CN')} {isDueOver && `(${t('overdueStatus')})`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-center">
                              {bill.status === 'PAID' && (
                                <UdsBadge status="healthy">{t('paidStatus')}</UdsBadge>
                              )}
                              {bill.status === 'PARTIAL' && (
                                <UdsBadge status="alert">{t('partialStatus')}</UdsBadge>
                              )}
                              {bill.status === 'UNPAID' && (
                                <UdsBadge status={isDueOver ? "critical" : "default"}>
                                  {isDueOver ? t('overdueStatus') : t('unpaidStatus')}
                                </UdsBadge>
                              )}
                            </td>
                            <td className="py-3.5 text-right font-mono font-semibold">
                              <div className="flex flex-col items-end">
                                <span className="text-neutral-200">{bill.currency?.symbol}{bill.amount.toFixed(2)}</span>
                                {bill.paidAmount > 0 && (
                                  <span className="text-[9px] text-neutral-500">{bill.currency?.symbol}{bill.paidAmount.toFixed(2)}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <div className="flex items-center justify-end gap-1.5">
                                {bill.status !== 'PAID' && (
                                  <UdsButton
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-full text-[9px] !font-bold"
                                    onClick={() => {
                                      setPayingBillId(bill.id);
                                      setPayAmount((bill.amount - bill.paidAmount).toFixed(2));
                                    }}
                                  >
                                    <DollarSign size={10} className="mr-0.5" /> {t('writeOffButton')}
                                  </UdsButton>
                                )}
                                <UdsButton
                                  variant="ghost"
                                  className="h-7 w-7 !p-0 rounded-full text-rose-500 hover:bg-rose-500/10 border-none"
                                  onClick={() => handleDeleteBill(bill.id)}
                                >
                                  <Trash2 size={10} />
                                </UdsButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {bills.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                            NO BILL TRANSACTIONS LOGGED.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </UdsCard>
            </div>
          </div>
        </>
      ) : activeTab === 'accounts' ? (
        /* 收款账户管理选项卡内容 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧：账户配置表单 */}
          <div className="lg:col-span-5">
            <UdsCard
              title={editingAccId ? t('editAccountTitle') : t('createAccountBtn')}
              action={
                editingAccId && (
                  <UdsButton variant="ghost" onClick={cancelEditAccount} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
                <UdsInput
                  label="内部显示名称"
                  placeholder="如: 公司基本户 / 销售现金库"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  required
                />

                <UdsInput
                  label="所属机构 / 支付渠道"
                  placeholder="如: 招商银行 / 支付宝 / PayPal"
                  value={accType}
                  onChange={(e) => setAccType(e.target.value)}
                  required
                />

                <UdsInput
                  label="账号 / 卡号"
                  placeholder="请输入银行卡号或平台账号"
                  value={accNo}
                  onChange={(e) => setAccNo(e.target.value)}
                  required
                />

                <UdsInput
                  label="开户人 / 持有人姓名"
                  placeholder="如: 张三 / 某某科技有限公司"
                  value={accHolder}
                  onChange={(e) => setAccHolder(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <UdsSelect
                    label="账户币种"
                    options={[
                      { value: '', label: '请选择币种' },
                      ...currencies.map(c => ({ value: c.id, label: `${c.name} (${c.symbol})` }))
                    ]}
                    value={accCurrencyId}
                    onChange={(e) => setAccCurrencyId(e.target.value)}
                  />
                  <UdsInput
                    label="初始余额 (期初)"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    disabled={!!editingAccId} // 编辑时不修改初始余额
                    required={!editingAccId}
                  />
                </div>

                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full">
                    {editingAccId ? t('saveChanges') : t('createAccountBtn')}
                  </UdsButton>
                </div>
              </form>
            </UdsCard>
          </div>

          {/* 右侧：收款账户列表 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('paymentAccountList')}>
              <div className="flex flex-col gap-4">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-1">
                        <CreditCard size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-200">{acc.name}</h4>
                          <UdsBadge status="default">
                            {acc.type}
                          </UdsBadge>
                        </div>
                        <p className="text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                          账号: <span className="text-white font-bold">{acc.accountNo}</span>
                        </p>
                        {acc.holder && (
                          <p className="text-[9px] text-neutral-500 font-sans mt-0.5">
                            开户/持有人: {acc.holder}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 md:items-center md:flex-row">
                      <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500">当前余额</span>
                        <span className="font-mono text-lg font-bold text-emerald-400">
                          {acc.currency?.symbol || ''}{acc.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <UdsButton
                          variant="ghost"
                        className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                        onClick={() => startEditAccount(acc)}
                      >
                        <Edit3 size={12} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDeleteAccount(acc.id)}
                      >
                        <Trash2 size={12} />
                      </UdsButton>
                    </div>
                  </div>
                </div>
                ))}
                {accounts.length === 0 && (
                  <span className="text-[10px] font-mono text-neutral-600 text-center py-4 block">
                    {t('noPaymentAccounts')}
                  </span>
                )}
              </div>
            </UdsCard>
          </div>
        </div>
      ) : (
        /* 货币管理选项卡内容 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧：货币配置表单 */}
          <div className="lg:col-span-5">
            <UdsCard
              title={editingCurId ? t('editCurrencyTitle') : t('createCurrencyBtn')}
              action={
                editingCurId && (
                  <UdsButton variant="ghost" onClick={cancelEditCurrency} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              <form onSubmit={handleSaveCurrency} className="flex flex-col gap-4">
                <UdsInput
                  label={t('currencyCodeLabel')}
                  placeholder="如: CNY, USD, EUR"
                  value={curCode}
                  onChange={(e) => setCurCode(e.target.value)}
                  required
                />

                <UdsInput
                  label={t('currencyNameLabel')}
                  placeholder={t('currencyNamePlaceholder')}
                  value={curName}
                  onChange={(e) => setCurName(e.target.value)}
                  required
                />

                <UdsInput
                  label={t('currencySymbolLabel')}
                  placeholder={t('currencySymbolPlaceholder')}
                  value={curSymbol}
                  onChange={(e) => setCurSymbol(e.target.value)}
                  required
                />

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={curIsDefault}
                    onChange={(e) => setCurIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{t('currencyIsDefault')}</span>
                </label>

                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full">
                    {editingCurId ? t('saveChanges') : t('createCurrencyBtn')}
                  </UdsButton>
                </div>
              </form>
            </UdsCard>
          </div>

          {/* 右侧：货币列表 */}
          <div className="lg:col-span-7">
            <UdsCard title={t('currencyList')}>
              <div className="flex flex-col gap-4">
                {currencies.map((cur) => (
                  <div
                    key={cur.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-1">
                        <Coins size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-200">{cur.name}</h4>
                          <UdsBadge status="healthy">{cur.code}</UdsBadge>
                          {cur.isDefault && (
                            <UdsBadge status="alert">{t('defaultCurrency')}</UdsBadge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                          {t('currencySymbolLabel')}: <span className="text-white font-bold text-sm">{cur.symbol}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                        onClick={() => startEditCurrency(cur)}
                      >
                        <Edit3 size={12} />
                      </UdsButton>
                      <UdsButton
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDeleteCurrency(cur.id)}
                        disabled={cur.isDefault}
                      >
                        <Trash2 size={12} />
                      </UdsButton>
                    </div>
                  </div>
                ))}
                {currencies.length === 0 && (
                  <span className="text-[10px] font-mono text-neutral-600 text-center py-4 block">
                    {t('noCurrencies')}
                  </span>
                )}
              </div>
            </UdsCard>
          </div>
        </div>
      )}

      {/* 浮动审计按钮：固定在页面右下角 */}
      <div className="fixed bottom-24 right-[2.5%] z-30">
        <UdsButton
          variant="ghost"
          className="h-9 px-4 text-[10px] font-black uppercase shadow-lg bg-black/70 border border-white/10"
          onClick={() => setIsAuditOpen(true)}
        >
          审计日志
        </UdsButton>
      </div>

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="finance"
        title={'财务审计'}
      />
    </div>
  );
};
