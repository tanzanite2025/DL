import { useState, useEffect, useCallback } from 'react';
import { Warehouse } from '../types';
import { warehousesApi } from '../services/api';

export function useWarehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await warehousesApi.list();
      setWarehouses(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const createWarehouse = async (data: { name: string; location?: string; description?: string }) => {
    const result = await warehousesApi.create(data);
    await fetchWarehouses();
    return result;
  };

  const updateWarehouse = async (id: string, data: { name: string; location?: string; description?: string }) => {
    const result = await warehousesApi.update(id, data);
    await fetchWarehouses();
    return result;
  };

  const deleteWarehouse = async (id: string) => {
    const result = await warehousesApi.delete(id);
    await fetchWarehouses();
    return result;
  };

  return { warehouses, isLoading, fetchWarehouses, createWarehouse, updateWarehouse, deleteWarehouse };
}
