import { useState, useEffect, useCallback } from 'react';
import { Supplier } from '../types';
import { suppliersApi } from '../services/api';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await suppliersApi.list();
      setSuppliers(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const createSupplier = async (data: any) => {
    const result = await suppliersApi.create(data);
    await fetchSuppliers();
    return result;
  };

  const updateSupplier = async (id: string, data: any) => {
    const result = await suppliersApi.update(id, data);
    await fetchSuppliers();
    return result;
  };

  const deleteSupplier = async (id: string) => {
    const result = await suppliersApi.delete(id);
    await fetchSuppliers();
    return result;
  };

  return { suppliers, isLoading, fetchSuppliers, createSupplier, updateSupplier, deleteSupplier };
}
