import React, { useState } from 'react';
import {
  UdsHeader,
  UdsCard,
  UdsButton,
  UdsInput,
  UdsSelect,
  UdsBadge,
  UdsProgressBar,
} from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { CounterpartyPicker } from '../components/counterparties/CounterpartyPicker';
import { useI18n } from '../i18n/I18nContext';
import {
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Trash2,
  Edit3,
  CreditCard,
  Coins,
} from 'lucide-react';
import { PaymentAccount, Currency, ShowToast, FinancialBill } from '../types';
import { useFinance } from '../hooks/useFinance';
import { useCurrencies } from '../hooks/useCurrencies';
import { useCounterparties } from '../hooks/useCounterparties';
import {
  buildBillSummaries,
  filterBillsByType,
  getBillCounterpartyName,
  type BillSummary,
} from './financeArapUtils';

interface FinanceARAPProps {
  token: string;
  showToast: ShowToast;
}

const DEFAULT_ACCOUNT_TYPE = 'WECHAT';

export const FinanceARAP: React.FC<FinanceARAPProps> = ({ token: _token, showToast }) => {
  const { t } = useI18n();
  const {
    bills,
    accounts,
    isLoading: financeLoading,
    createBill,
    payBill,
    deleteBill,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useFinance();
  const {
    currencies,
    isLoading: currencyLoading,
    createCurrency,
    updateCurrency,
    deleteCurrency,
  } = useCurrencies();
  const {
    counterparties,
    isLoading: counterpartiesLoading,
  } = useCounterparties('both');

  const [activeTab, setActiveTab] = useState<'ledger' | 'accounts' | 'currencies'>('ledger');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formType, setFormType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  const [formAmount, setFormAmount] = useState('');
  const [formCounterpartyId, setFormCounterpartyId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCurrencyId, setFormCurrencyId] = useState('');

  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState(DEFAULT_ACCOUNT_TYPE);
  const [accNo, setAccNo] = useState('');
  const [accHolder, setAccHolder] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accCurrencyId, setAccCurrencyId] = useState('');
  const [editingAccId, setEditingAccId] = useState<string | null>(null);

  const [curCode, setCurCode] = useState('');
  const [curName, setCurName] = useState('');
  const [curSymbol, setCurSymbol] = useState('');
  const [curIsDefault, setCurIsDefault] = useState(false);
  const [editingCurId, setEditingCurId] = useState<string | null>(null);

  const isLoading = financeLoading || currencyLoading || counterpartiesLoading;
  const billCounterparties = React.useMemo(() => counterparties.filter((counterparty) => {
    if (counterparty.roleType === 'BOTH') return true;
    return formType === 'RECEIVABLE'
      ? counterparty.roleType === 'CUSTOMER'
      : counterparty.roleType === 'SUPPLIER';
  }), [counterparties, formType]);
  const currencyOptions = [
    { value: '', label: 'Select Currency' },
    ...currencies.map((currency) => ({
      value: currency.id,
      label: `${currency.name} (${currency.symbol})`,
    })),
  ];

  const receivableBills = filterBillsByType(bills, 'RECEIVABLE');
  const payableBills = filterBillsByType(bills, 'PAYABLE');
  const receivableSummaries = buildBillSummaries(receivableBills);
  const payableSummaries = buildBillSummaries(payableBills);
  const payingBill = payingBillId ? bills.find((bill) => bill.id === payingBillId) ?? null : null;
  const payableAccountsForBill = payingBill
    ? accounts.filter((account) => account.currencyId === payingBill.currencyId)
    : [];

  React.useEffect(() => {
    if (!formCounterpartyId) return;
    if (!billCounterparties.some((counterparty) => counterparty.id === formCounterpartyId)) {
      setFormCounterpartyId('');
    }
  }, [billCounterparties, formCounterpartyId]);

  const resetAccountForm = () => {
    setAccName('');
    setAccType(DEFAULT_ACCOUNT_TYPE);
    setAccNo('');
    setAccHolder('');
    setAccBalance('');
    setAccCurrencyId('');
    setEditingAccId(null);
  };

  const resetCurrencyForm = () => {
    setCurCode('');
    setCurName('');
    setCurSymbol('');
    setCurIsDefault(false);
    setEditingCurId(null);
  };

  const closeWriteOff = () => {
    setPayingBillId(null);
    setPayAmount('');
    setSelectedAccountId('');
  };

  const startWriteOff = (bill: FinancialBill) => {
    setPayingBillId(bill.id);
    setPayAmount((bill.amount - bill.paidAmount).toFixed(2));
    setSelectedAccountId('');
  };

  const formatAmount = (amount: number) =>
    amount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getSettledLabel = (type: 'RECEIVABLE' | 'PAYABLE') =>
    type === 'RECEIVABLE' ? t('receivedAmount') : t('paidAmount');

  const getPendingLabel = (type: 'RECEIVABLE' | 'PAYABLE') =>
    type === 'RECEIVABLE' ? t('pendingRecovery') : t('pendingPayment');

  const getProgressLabel = (type: 'RECEIVABLE' | 'PAYABLE') =>
    type === 'RECEIVABLE' ? t('recoveryProgress') : t('paymentProgress');

  const getBillTypeLabel = (type: 'RECEIVABLE' | 'PAYABLE') =>
    type === 'RECEIVABLE' ? t('receivableBill') : t('payableBill');

  const getBillSymbol = (bill: FinancialBill) => bill.currency?.symbol || '';

  const renderStatusBadge = (bill: FinancialBill) => {
    const isDueOver = new Date(bill.dueDate) < new Date() && bill.status !== 'PAID';

    if (bill.status === 'PAID') {
      return <UdsBadge status="healthy">{t('paidStatus')}</UdsBadge>;
    }

    if (bill.status === 'PARTIAL') {
      return <UdsBadge status="alert">{t('partialStatus')}</UdsBadge>;
    }

    return (
      <UdsBadge status={isDueOver ? 'critical' : 'default'}>
        {isDueOver ? t('overdueStatus') : t('unpaidStatus')}
      </UdsBadge>
    );
  };

  const renderSummaryCard = (
    title: string,
    type: 'RECEIVABLE' | 'PAYABLE',
    summaries: BillSummary[]
  ) => {
    const pendingClassName = type === 'RECEIVABLE' ? 'text-amber-500' : 'text-rose-500';

    return (
      <UdsCard title={title}>
        <div className="flex flex-col gap-4">
          {summaries.length > 0 ? (
            summaries.map((summary) => {
              const currencyLabel = summary.symbol || summary.currencyId.toUpperCase();
              const amountPrefix = summary.symbol || `${summary.currencyId.toUpperCase()} `;
              const progress =
                summary.total > 0 ? ((summary.paid / summary.total) * 100).toFixed(1) : '0.0';

              return (
                <div
                  key={summary.currencyId}
                  className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                      {currencyLabel} {t('ledgerCurrency')}
                    </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                      {progress}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">
                        {t('totalAmount')}
                      </span>
                      <span className="text-lg font-mono font-bold text-white">
                        {amountPrefix}
                        {formatAmount(summary.total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">
                        {getSettledLabel(type)}
                      </span>
                      <span className="text-lg font-mono font-bold text-emerald-500">
                        {amountPrefix}
                        {formatAmount(summary.paid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider block">
                        {getPendingLabel(type)}
                      </span>
                      <span className={`text-lg font-mono font-bold ${pendingClassName}`}>
                        {amountPrefix}
                        {formatAmount(summary.pending)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-4">
                    <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                      <span>{getProgressLabel(type)}</span>
                      <span>{progress}%</span>
                    </div>
                    <UdsProgressBar value={summary.paid} max={summary.total || 1} />
                  </div>
                </div>
              );
            })
          ) : (
            <span className="text-[10px] font-mono text-neutral-600 text-center py-6 block">
              {t('noBillsLogged')}
            </span>
          )}
        </div>
      </UdsCard>
    );
  };

  const renderLedgerTable = (
    title: string,
    type: 'RECEIVABLE' | 'PAYABLE',
    items: FinancialBill[]
  ) => {
    return (
      <UdsCard title={title}>
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
              {items.map((bill) => {
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
                          <span className="font-semibold text-neutral-200">{getBillCounterpartyName(bill)}</span>
                          <span className="text-[8px] font-mono text-neutral-500 uppercase">
                            {type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="text-neutral-300">{bill.description || '---'}</span>
                        <span
                          className={`text-[8px] font-mono mt-0.5 ${
                            isDueOver ? 'text-rose-500 font-bold' : 'text-neutral-500'
                          }`}
                        >
                          DUE: {new Date(bill.dueDate).toLocaleDateString('zh-CN')}{' '}
                          {isDueOver && `(${t('overdueStatus')})`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">{renderStatusBadge(bill)}</td>
                    <td className="py-3.5 text-right font-mono font-semibold">
                      <div className="flex flex-col items-end">
                        <span className="text-neutral-200">
                          {getBillSymbol(bill)}
                          {bill.amount.toFixed(2)}
                        </span>
                        {bill.paidAmount > 0 && (
                          <span className="text-[9px] text-neutral-500">
                            {getSettledLabel(type)}: {getBillSymbol(bill)}
                            {bill.paidAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        {bill.status !== 'PAID' && (
                          <UdsButton
                            type="button"
                            variant="ghost"
                            className="h-7 px-2.5 rounded-full text-[9px] !font-bold"
                            onClick={() => startWriteOff(bill)}
                          >
                            <DollarSign size={10} className="mr-0.5" /> {t('writeOffButton')}
                          </UdsButton>
                        )}
                        <UdsButton
                          type="button"
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
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-[10px] font-mono text-neutral-600">
                    {t('noBillsLogged')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </UdsCard>
    );
  };

  const handleCreateBill = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = parseFloat(formAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      showToast(t('errBillAmountPositive'), 'error');
      return;
    }

    if (!formCounterpartyId || !formDueDate || !formCurrencyId) {
      showToast(t('errBillRequired'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBill({
        type: formType,
        amount,
        currencyId: formCurrencyId,
        counterpartyId: formCounterpartyId,
        description: formDescription.trim(),
        dueDate: formDueDate,
      });

      showToast(t('billCreatedSuccess'), 'success');
      setFormAmount('');
      setFormCounterpartyId('');
      setFormDescription('');
      setFormDueDate('');
      setFormCurrencyId('');
    } catch (error: any) {
      showToast(error.message || t('errBillRecordFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayBill = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payingBill) {
      return;
    }

    const amount = parseFloat(payAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      showToast(t('errWriteOffAmountPositive'), 'error');
      return;
    }

    const remaining = payingBill.amount - payingBill.paidAmount;
    if (amount > remaining) {
      showToast(`${t('errWriteOffExceedsRemaining')} (${remaining.toFixed(2)})`, 'error');
      return;
    }

    try {
      await payBill(payingBill.id, {
        payAmount: amount,
        accountId: selectedAccountId || undefined,
      });

      const accountName =
        accounts.find((account) => account.id === selectedAccountId)?.name || t('noAccountSpecified');
      showToast(`${t('writeOffSuccess')}${accountName}`, 'success');
      closeWriteOff();
    } catch (error: any) {
      showToast(error.message || t('errBillWriteOffFailed'), 'error');
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!window.confirm(t('billDeleteConfirm'))) {
      return;
    }

    try {
      await deleteBill(id);
      if (payingBillId === id) {
        closeWriteOff();
      }
      showToast(t('billDeletedSuccess'), 'success');
    } catch (error: any) {
      showToast(error.message || t('errBillVoidFailed'), 'error');
    }
  };

  const handleSaveAccount = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!accName.trim() || !accNo.trim() || !accCurrencyId) {
      showToast(t('errAccRequired'), 'error');
      return;
    }

    const payload = {
      name: accName.trim(),
      type: accType.trim() || DEFAULT_ACCOUNT_TYPE,
      accountNo: accNo.trim(),
      holder: accHolder.trim(),
      currencyId: accCurrencyId,
    };

    try {
      if (editingAccId) {
        await updateAccount(editingAccId, payload);
        showToast(t('accUpdatedSuccess'), 'success');
      } else {
        await createAccount({
          ...payload,
          balance: accBalance || '0',
        });
        showToast(t('accCreatedSuccess'), 'success');
      }
      resetAccountForm();
    } catch (error: any) {
      showToast(error.message || t('errAccSaveFailed'), 'error');
    }
  };

  const startEditAccount = (account: PaymentAccount) => {
    setAccName(account.name);
    setAccType(account.type);
    setAccNo(account.accountNo);
    setAccHolder(account.holder || '');
    setAccBalance('');
    setAccCurrencyId(account.currencyId);
    setEditingAccId(account.id);
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm(t('accDeleteConfirm'))) {
      return;
    }

    try {
      await deleteAccount(id);
      showToast(t('accDeletedSuccess'), 'success');
      if (editingAccId === id) {
        resetAccountForm();
      }
    } catch (error: any) {
      showToast(error.message || t('errNetwork'), 'error');
    }
  };

  const handleSaveCurrency = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!curCode.trim() || !curName.trim() || !curSymbol.trim()) {
      showToast(t('errCurrencyRequired'), 'error');
      return;
    }

    const payload = {
      code: curCode.trim().toUpperCase(),
      name: curName.trim(),
      symbol: curSymbol.trim(),
      isDefault: curIsDefault,
    };

    try {
      if (editingCurId) {
        await updateCurrency(editingCurId, payload);
        showToast(t('currencyUpdatedSuccess'), 'success');
      } else {
        await createCurrency(payload);
        showToast(t('currencyCreatedSuccess'), 'success');
      }
      resetCurrencyForm();
    } catch (error: any) {
      showToast(error.message || t('errCurrencySaveFailed'), 'error');
    }
  };

  const startEditCurrency = (currency: Currency) => {
    setEditingCurId(currency.id);
    setCurCode(currency.code);
    setCurName(currency.name);
    setCurSymbol(currency.symbol);
    setCurIsDefault(currency.isDefault);
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!window.confirm(t('currencyDeleteConfirm'))) {
      return;
    }

    try {
      await deleteCurrency(id);
      showToast(t('currencyDeletedSuccess'), 'success');
      if (editingCurId === id) {
        resetCurrencyForm();
      }
    } catch (error: any) {
      showToast(error.message || t('errCurrencyDeleteFailed'), 'error');
    }
  };

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
      <UdsHeader className="hidden" title={t('financeHeader')} description={t('financeDesc')} />

      <div className="flex bg-[#121214] p-1.5 rounded-2xl self-start gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
            activeTab === 'ledger' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
          }`}
        >
          {t('transLedgerTab')}
        </button>
        <button
          type="button"
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
          type="button"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 flex flex-col gap-8">
            <UdsCard title={t('recordBill')}>
              <form onSubmit={handleCreateBill} className="flex flex-col gap-4">
                <UdsSelect
                  label={t('billType')}
                  options={[
                    { value: 'RECEIVABLE', label: t('receivableBill') },
                    { value: 'PAYABLE', label: t('payableBill') },
                  ]}
                  value={formType}
                  onChange={(event) =>
                    setFormType(event.target.value as 'RECEIVABLE' | 'PAYABLE')
                  }
                  disabled={isSubmitting}
                />
                <CounterpartyPicker
                  label={t('billPartner')}
                  value={formCounterpartyId}
                  counterparties={billCounterparties}
                  onChange={setFormCounterpartyId}
                  placeholder={t('partnerPlaceholder')}
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
                    onChange={(event) => setFormAmount(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  <UdsSelect
                    label={t('currencyCodeLabel')}
                    options={currencyOptions}
                    value={formCurrencyId}
                    onChange={(event) => setFormCurrencyId(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <UdsInput
                  label={t('dueDateLabel')}
                  type="date"
                  value={formDueDate}
                  onChange={(event) => setFormDueDate(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <UdsInput
                  label={t('billDesc')}
                  placeholder={t('billRemarksPlaceholder')}
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  disabled={isSubmitting}
                />
                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? t('loading') : t('recordBillButton')}
                  </UdsButton>
                </div>
              </form>
            </UdsCard>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-8">
            {payingBill && (
              <UdsCard
                title={t('writeOffTitle')}
                action={
                  <UdsButton type="button" variant="ghost" onClick={closeWriteOff} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                }
                className="border-neutral-500 bg-neutral-900/60"
              >
                <form onSubmit={handlePayBill} className="flex flex-col gap-4">
                  <div className="text-[10px] text-neutral-400 font-mono flex flex-col gap-1.5 p-3 rounded-2xl bg-black/30">
                    <div>
                      {t('billPartner')}: <span className="text-white font-bold">{getBillCounterpartyName(payingBill)}</span>
                    </div>
                    <div>
                      {t('totalAmount')}:{' '}
                      <span className="text-white font-bold">
                        {getBillSymbol(payingBill)}
                        {payingBill.amount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      {getSettledLabel(payingBill.type)}:{' '}
                      <span className="text-emerald-500 font-bold">
                        {getBillSymbol(payingBill)}
                        {payingBill.paidAmount.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      {getPendingLabel(payingBill.type)}:{' '}
                      <span className="text-amber-500 font-bold">
                        {getBillSymbol(payingBill)}
                        {(payingBill.amount - payingBill.paidAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UdsInput
                      label={t('writeOffAmount')}
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={payingBill.amount - payingBill.paidAmount}
                      placeholder={(payingBill.amount - payingBill.paidAmount).toFixed(2)}
                      value={payAmount}
                      onChange={(event) => setPayAmount(event.target.value)}
                      required
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        {t('writeOffAccountLabel')}
                      </label>
                      <select
                        className="w-full h-11 px-4 rounded-2xl border-none bg-neutral-900 text-sm text-white focus:ring-1 focus:ring-neutral-700 transition-all cursor-pointer"
                        value={selectedAccountId}
                        onChange={(event) => setSelectedAccountId(event.target.value)}
                      >
                        <option value="">{t('noAccountSpecified')}</option>
                        {payableAccountsForBill.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({account.type}) - BALANCE:{' '}
                            {account.currency?.symbol || ''}
                            {account.balance?.toFixed(2) || '0.00'}
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
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {renderSummaryCard(t('arTotal'), 'RECEIVABLE', receivableSummaries)}
              {renderSummaryCard(t('apTotal'), 'PAYABLE', payableSummaries)}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {renderLedgerTable(getBillTypeLabel('RECEIVABLE'), 'RECEIVABLE', receivableBills)}
              {renderLedgerTable(getBillTypeLabel('PAYABLE'), 'PAYABLE', payableBills)}
            </div>
          </div>
        </div>
      ) : activeTab === 'accounts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <UdsCard
              title={editingAccId ? t('editAccountTitle') : t('createAccountBtn')}
              action={
                editingAccId && (
                  <UdsButton type="button" variant="ghost" onClick={resetAccountForm} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              <form onSubmit={handleSaveAccount} className="flex flex-col gap-4">
                <UdsInput
                  label={t('accountNameLabel')}
                  value={accName}
                  onChange={(event) => setAccName(event.target.value)}
                  required
                />
                <UdsInput
                  label={t('accountTypeLabel')}
                  value={accType}
                  onChange={(event) => setAccType(event.target.value)}
                  required
                />
                <UdsInput
                  label={t('accountNoLabel')}
                  value={accNo}
                  onChange={(event) => setAccNo(event.target.value)}
                  required
                />
                <UdsInput
                  label={t('holderLabel')}
                  value={accHolder}
                  onChange={(event) => setAccHolder(event.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <UdsSelect
                    label={t('currencyCodeLabel')}
                    options={currencyOptions}
                    value={accCurrencyId}
                    onChange={(event) => setAccCurrencyId(event.target.value)}
                    required
                  />
                  <UdsInput
                    label="Opening Balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accBalance}
                    onChange={(event) => setAccBalance(event.target.value)}
                    disabled={!!editingAccId}
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

          <div className="lg:col-span-7">
            <UdsCard title={t('paymentAccountList')}>
              <div className="flex flex-col gap-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-1">
                        <CreditCard size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-200">{account.name}</h4>
                          <UdsBadge status="default">{account.type}</UdsBadge>
                        </div>
                        <p className="text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                          {t('accountNoLabel')}: <span className="text-white font-bold">{account.accountNo}</span>
                        </p>
                        {account.holder && (
                          <p className="text-[9px] text-neutral-500 mt-0.5">
                            {t('holderLabel')}: {account.holder}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 md:items-center md:flex-row">
                      <div className="flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black tracking-widest uppercase text-neutral-500">
                          BALANCE
                        </span>
                        <span className="font-mono text-lg font-bold text-emerald-400">
                          {account.currency?.symbol || ''}
                          {account.balance?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || '0.00'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <UdsButton
                          type="button"
                          variant="ghost"
                          className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                          onClick={() => startEditAccount(account)}
                        >
                          <Edit3 size={12} />
                        </UdsButton>
                        <UdsButton
                          type="button"
                          variant="ghost"
                          className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleDeleteAccount(account.id)}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <UdsCard
              title={editingCurId ? t('editCurrencyTitle') : t('createCurrencyBtn')}
              action={
                editingCurId && (
                  <UdsButton type="button" variant="ghost" onClick={resetCurrencyForm} className="h-7 px-3">
                    {t('cancel')}
                  </UdsButton>
                )
              }
            >
              <form onSubmit={handleSaveCurrency} className="flex flex-col gap-4">
                <UdsInput
                  label={t('currencyCodeLabel')}
                  placeholder="CNY / USD / EUR"
                  value={curCode}
                  onChange={(event) => setCurCode(event.target.value)}
                  required
                />
                <UdsInput
                  label={t('currencyNameLabel')}
                  placeholder={t('currencyNamePlaceholder')}
                  value={curName}
                  onChange={(event) => setCurName(event.target.value)}
                  required
                />
                <UdsInput
                  label={t('currencySymbolLabel')}
                  placeholder={t('currencySymbolPlaceholder')}
                  value={curSymbol}
                  onChange={(event) => setCurSymbol(event.target.value)}
                  required
                />
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={curIsDefault}
                    onChange={(event) => setCurIsDefault(event.target.checked)}
                    className="h-4 w-4 rounded border-dashed border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer accent-white"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    {t('currencyIsDefault')}
                  </span>
                </label>
                <div className="border-t border-solid border-white/5 pt-4">
                  <UdsButton type="submit" variant="primary" className="w-full">
                    {editingCurId ? t('saveChanges') : t('createCurrencyBtn')}
                  </UdsButton>
                </div>
              </form>
            </UdsCard>
          </div>

          <div className="lg:col-span-7">
            <UdsCard title={t('currencyList')}>
              <div className="flex flex-col gap-4">
                {currencies.map((currency) => (
                  <div
                    key={currency.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-1">
                        <Coins size={14} className="text-neutral-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-200">{currency.name}</h4>
                          <UdsBadge status="healthy">{currency.code}</UdsBadge>
                          {currency.isDefault && (
                            <UdsBadge status="alert">{t('defaultCurrency')}</UdsBadge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                          {t('currencySymbolLabel')}: <span className="text-white font-bold text-sm">{currency.symbol}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <UdsButton
                        type="button"
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-neutral-400 hover:text-white"
                        onClick={() => startEditCurrency(currency)}
                      >
                        <Edit3 size={12} />
                      </UdsButton>
                      <UdsButton
                        type="button"
                        variant="ghost"
                        className="h-8 !p-2 rounded-full text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleDeleteCurrency(currency.id)}
                        disabled={currency.isDefault}
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

      <div className="fixed bottom-24 right-[2.5%] z-30">
        <UdsButton
          type="button"
          variant="ghost"
          className="h-9 px-4 text-[10px] font-black uppercase shadow-lg bg-black/70 border border-white/10"
          onClick={() => setIsAuditOpen(true)}
        >
          {t('auditLog')}
        </UdsButton>
      </div>

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="finance"
        title={t('auditLog')}
      />
    </div>
  );
};
