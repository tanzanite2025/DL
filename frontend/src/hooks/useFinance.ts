import { useState, useEffect, useCallback } from 'react';
import { FinancialBill, PaymentAccount } from '../types';
import { financeApi, paymentAccountsApi } from '../services/api';

export function useFinance() {
  const [bills, setBills] = useState<FinancialBill[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [billsData, accountsData] = await Promise.all([
        financeApi.listBills(),
        paymentAccountsApi.list(),
      ]);
      setBills(billsData);
      setAccounts(accountsData);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Bills ---
  const createBill = async (data: any) => {
    const result = await financeApi.createBill(data);
    await fetchData();
    return result;
  };

  const payBill = async (id: string, data: { payAmount: number; accountId?: string }) => {
    const result = await financeApi.payBill(id, data);
    await fetchData();
    return result;
  };

  const deleteBill = async (id: string) => {
    const result = await financeApi.deleteBill(id);
    await fetchData();
    return result;
  };

  // --- Payment Accounts ---
  const createAccount = async (data: any) => {
    const result = await paymentAccountsApi.create(data);
    await fetchData();
    return result;
  };

  const updateAccount = async (id: string, data: any) => {
    const result = await paymentAccountsApi.update(id, data);
    await fetchData();
    return result;
  };

  const deleteAccount = async (id: string) => {
    const result = await paymentAccountsApi.delete(id);
    await fetchData();
    return result;
  };

  return {
    bills, accounts, isLoading, fetchData,
    createBill, payBill, deleteBill,
    createAccount, updateAccount, deleteAccount,
  };
}
