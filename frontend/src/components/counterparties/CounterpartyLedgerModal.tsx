import React from 'react';
import { UdsBadge, UdsButton, UdsCard } from '../uds/UdsComponents';
import type { CounterpartyLedger } from '../../types';
import { getCounterpartyRoleLabels } from './counterpartyUtils';

interface CounterpartyLedgerModalProps {
  isOpen: boolean;
  ledger: CounterpartyLedger | null;
  onClose: () => void;
}

const formatAmount = (amount: number) =>
  amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const CounterpartyLedgerModal: React.FC<CounterpartyLedgerModalProps> = ({
  isOpen,
  ledger,
  onClose,
}) => {
  if (!isOpen || !ledger) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl">
        <UdsCard
          title={`往来主体台账 - ${ledger.counterparty.name}`}
          action={
            <UdsButton type="button" variant="ghost" onClick={onClose}>
              关闭
            </UdsButton>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <UdsBadge status={ledger.counterparty.isActive ? 'healthy' : 'default'}>
                {ledger.counterparty.code}
              </UdsBadge>
              {getCounterpartyRoleLabels(ledger.counterparty.roleType).map((label) => (
                <UdsBadge key={label}>{label}</UdsBadge>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  应收余额
                </span>
                <span className="mt-2 block text-xl font-mono font-bold text-emerald-400">
                  {formatAmount(ledger.receivable.pending)}
                </span>
                <span className="mt-1 block text-[10px] text-neutral-500">
                  总额 {formatAmount(ledger.receivable.total)}
                </span>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  应付余额
                </span>
                <span className="mt-2 block text-xl font-mono font-bold text-rose-400">
                  {formatAmount(ledger.payable.pending)}
                </span>
                <span className="mt-1 block text-[10px] text-neutral-500">
                  总额 {formatAmount(ledger.payable.total)}
                </span>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <span className="block text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  净头寸
                </span>
                <span className="mt-2 block text-xl font-mono font-bold text-white">
                  {formatAmount(ledger.netPosition)}
                </span>
                <span className="mt-1 block text-[10px] text-neutral-500">
                  应收减应付
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-300">
              <div className="rounded-2xl border border-white/10 p-4">
                财务单据 <span className="font-mono text-white">{ledger.bills.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                销售订单 <span className="font-mono text-white">{ledger.salesOrders.length}</span>
              </div>
              <div className="rounded-2xl border border-white/10 p-4">
                采购订单 <span className="font-mono text-white">{ledger.purchaseOrders.length}</span>
              </div>
            </div>
          </div>
        </UdsCard>
      </div>
    </div>
  );
};
