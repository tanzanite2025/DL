import { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder } from '../types';
import { purchaseOrdersApi } from '../services/api';

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await purchaseOrdersApi.list();
      setOrders(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const createOrder = async (data: any) => {
    const result = await purchaseOrdersApi.create(data);
    await fetchOrders();
    return result;
  };

  const updateOrder = async (id: string, data: any) => {
    const result = await purchaseOrdersApi.update(id, data);
    await fetchOrders();
    return result;
  };

  const deleteOrder = async (id: string) => {
    const result = await purchaseOrdersApi.delete(id);
    await fetchOrders();
    return result;
  };

  const receiveOrder = async (id: string, data: { receiveQty: number; warehouseId: string }) => {
    const result = await purchaseOrdersApi.receive(id, data);
    await fetchOrders();
    return result;
  };

  return { orders, isLoading, fetchOrders, createOrder, updateOrder, deleteOrder, receiveOrder };
}
