import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { customersApi } from '../services/api';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await customersApi.list();
      setCustomers(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const createCustomer = async (data: any) => {
    const result = await customersApi.create(data);
    await fetchCustomers();
    return result;
  };

  const updateCustomer = async (id: string, data: any) => {
    const result = await customersApi.update(id, data);
    await fetchCustomers();
    return result;
  };

  const deleteCustomer = async (id: string) => {
    const result = await customersApi.delete(id);
    await fetchCustomers();
    return result;
  };

  return { customers, isLoading, fetchCustomers, createCustomer, updateCustomer, deleteCustomer };
}
