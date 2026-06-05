import { useCallback, useEffect, useState } from 'react';
import type { Counterparty, CounterpartyLedger } from '../types';
import { counterpartiesApi } from '../services/api';

export function useCounterparties(role: 'customer' | 'supplier' | 'both' = 'both') {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCounterparties = useCallback(async (q = '') => {
    setIsLoading(true);
    try {
      const data = await counterpartiesApi.list({ role, q: q || undefined });
      setCounterparties(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchCounterparties();
  }, [fetchCounterparties]);

  const createCounterparty = async (payload: Partial<Counterparty>) => {
    const created = await counterpartiesApi.create(payload);
    await fetchCounterparties();
    return created;
  };

  const updateCounterparty = async (id: string, payload: Partial<Counterparty>) => {
    const updated = await counterpartiesApi.update(id, payload);
    await fetchCounterparties();
    return updated;
  };

  const deleteCounterparty = async (id: string) => {
    const removed = await counterpartiesApi.delete(id);
    await fetchCounterparties();
    return removed;
  };

  const loadLedger = async (id: string): Promise<CounterpartyLedger> => {
    return counterpartiesApi.getLedger(id);
  };

  return {
    counterparties,
    isLoading,
    fetchCounterparties,
    createCounterparty,
    updateCounterparty,
    deleteCounterparty,
    loadLedger,
  };
}
