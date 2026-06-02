import { useState, useEffect, useCallback } from 'react';
import { SalesOrder } from '../types';
import { salesOrdersApi } from '../services/api';

export function useSalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await salesOrdersApi.list();
      setOrders(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const createOrder = async (data: any) => {
    const result = await salesOrdersApi.create(data);
    await fetchOrders();
    return result;
  };

  const updateOrder = async (id: string, data: any) => {
    const result = await salesOrdersApi.update(id, data);
    await fetchOrders();
    return result;
  };

  const deleteOrder = async (id: string) => {
    const result = await salesOrdersApi.delete(id);
    await fetchOrders();
    return result;
  };

  const createBillFromOrder = async (id: string) => {
    const result = await salesOrdersApi.createBill(id);
    await fetchOrders();
    return result;
  };

  return { orders, isLoading, fetchOrders, createOrder, updateOrder, deleteOrder, createBillFromOrder };
}
