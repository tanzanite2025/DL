import React from 'react';
import { UdsButton, UdsCard, UdsInput, UdsSelect } from '../uds/UdsComponents';
import { CounterpartyPicker } from '../counterparties/CounterpartyPicker';
import { useI18n } from '../../i18n/I18nContext';
import type { Counterparty, Currency, ShowToast } from '../../types';
import {
  getBillCounterpartiesForType,
  type BillType,
} from '../../pages/financeArapUtils';

interface FinancialBillModalProps {
  isOpen: boolean;
  counterparties: Counterparty[];
  currencies: Currency[];
  showToast: ShowToast;
  onClose: () => void;
  onSubmit: (values: {
    type: BillType;
    amount: number;
    counterpartyId: string;
    currencyId: string;
    description: string;
    dueDate: string;
  }) => Promise<void>;
}

export const FinancialBillModal: React.FC<FinancialBillModalProps> = ({
  isOpen,
  counterparties,
  currencies,
  showToast,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();
  const [type, setType] = React.useState<BillType>('RECEIVABLE');
  const [amount, setAmount] = React.useState('');
  const [counterpartyId, setCounterpartyId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [currencyId, setCurrencyId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const billCounterparties = React.useMemo(
    () => getBillCounterpartiesForType(counterparties, type),
    [counterparties, type],
  );
  const currencyOptions = React.useMemo(
    () => [
      { value: '', label: 'Select Currency' },
      ...currencies.map((currency) => ({
        value: currency.id,
        label: `${currency.name} (${currency.symbol})`,
      })),
    ],
    [currencies],
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setType('RECEIVABLE');
    setAmount('');
    setCounterpartyId('');
    setDescription('');
    setDueDate('');
    setCurrencyId('');
    setIsSubmitting(false);
  }, [isOpen]);

  React.useEffect(() => {
    if (!counterpartyId) return;
    if (!billCounterparties.some((counterparty) => counterparty.id === counterpartyId)) {
      setCounterpartyId('');
    }
  }, [billCounterparties, counterpartyId]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast(t('errBillAmountPositive'), 'error');
      return;
    }

    if (!counterpartyId || !dueDate || !currencyId) {
      showToast(t('errBillRequired'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        amount: parsedAmount,
        currencyId,
        counterpartyId,
        description: description.trim(),
        dueDate,
      });
      onClose();
    } catch (error: any) {
      showToast(error.message || t('errBillRecordFailed'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl">
        <UdsCard
          title={t('recordBill')}
          action={
            <UdsButton type="button" variant="ghost" onClick={onClose} className="h-7 px-3">
              {t('cancel')}
            </UdsButton>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <UdsSelect
              label={t('billType')}
              options={[
                { value: 'RECEIVABLE', label: t('receivableBill') },
                { value: 'PAYABLE', label: t('payableBill') },
              ]}
              value={type}
              onChange={(event) => setType(event.target.value as BillType)}
              disabled={isSubmitting}
            />
            <CounterpartyPicker
              label={t('billPartner')}
              value={counterpartyId}
              counterparties={billCounterparties}
              onChange={setCounterpartyId}
              placeholder={t('partnerPlaceholder')}
              disabled={isSubmitting}
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UdsInput
                label={t('amountLabel')}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <UdsSelect
                label={t('currencyCodeLabel')}
                options={currencyOptions}
                value={currencyId}
                onChange={(event) => setCurrencyId(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <UdsInput
              label={t('dueDateLabel')}
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <UdsInput
              label={t('billDesc')}
              placeholder={t('billRemarksPlaceholder')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
    </div>
  );
};
