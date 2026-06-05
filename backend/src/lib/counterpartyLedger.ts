export type CounterpartyLedgerBill = {
  id: string;
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: number;
  paidAmount: number;
};

export type CounterpartyLedgerParty = {
  id: string;
  code: string;
  name: string;
  roleType: 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
  isActive: boolean;
};

function summarizeBills(bills: CounterpartyLedgerBill[]) {
  return bills.reduce(
    (acc, bill) => ({
      total: acc.total + bill.amount,
      paid: acc.paid + bill.paidAmount,
      pending: acc.pending + (bill.amount - bill.paidAmount),
    }),
    { total: 0, paid: 0, pending: 0 },
  );
}

export function buildCounterpartyLedger(input: {
  counterparty: CounterpartyLedgerParty;
  bills: CounterpartyLedgerBill[];
  salesOrders: Array<{ id: string; orderNo: string }>;
  purchaseOrders: Array<{ id: string; orderNo: string }>;
}) {
  const receivable = summarizeBills(input.bills.filter((bill) => bill.type === 'RECEIVABLE'));
  const payable = summarizeBills(input.bills.filter((bill) => bill.type === 'PAYABLE'));

  return {
    counterparty: input.counterparty,
    receivable,
    payable,
    netPosition: receivable.total - payable.total,
    bills: input.bills,
    salesOrders: input.salesOrders,
    purchaseOrders: input.purchaseOrders,
  };
}
