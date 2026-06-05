export function buildManualBillDraft(input: {
  type: 'RECEIVABLE' | 'PAYABLE';
  amount: number;
  currencyId: string;
  description: string | null;
  dueDate: Date;
  counterparty: { id: string; name: string };
}) {
  return {
    type: input.type,
    amount: input.amount,
    currencyId: input.currencyId,
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: input.counterparty.id,
    counterpartyNameSnapshot: input.counterparty.name,
    sourceType: 'MANUAL',
    sourceId: null,
    description: input.description,
    dueDate: input.dueDate,
  };
}

export function buildSalesOrderBillDraft(input: {
  amount: number;
  currencyId: string;
  dueDate: Date;
  salesOrderId: string;
  counterparty: { id: string; name: string };
  description: string | null;
}) {
  return {
    type: 'RECEIVABLE',
    amount: input.amount,
    currencyId: input.currencyId,
    paidAmount: 0,
    status: 'UNPAID',
    counterpartyId: input.counterparty.id,
    counterpartyNameSnapshot: input.counterparty.name,
    sourceType: 'SALES_ORDER',
    sourceId: input.salesOrderId,
    description: input.description,
    dueDate: input.dueDate,
  };
}
