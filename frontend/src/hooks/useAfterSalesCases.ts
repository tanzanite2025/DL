import { useState, useEffect, useCallback } from 'react';
import { AfterSalesCase } from '../types';
import { afterSalesApi } from '../services/api';

export function useAfterSalesCases() {
  const [cases, setCases] = useState<AfterSalesCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await afterSalesApi.list();
      setCases(data as AfterSalesCase[]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const createCase = async (payload: any) => {
    const created = await afterSalesApi.create(payload);
    await fetchCases();
    return created;
  };

  const updateCase = async (id: string, payload: any) => {
    const updated = await afterSalesApi.update(id, payload);
    await fetchCases();
    return updated;
  };

  const deleteCase = async (id: string) => {
    const result = await afterSalesApi.delete(id);
    await fetchCases();
    return result;
  };

  return { cases, isLoading, fetchCases, createCase, updateCase, deleteCase };
}
