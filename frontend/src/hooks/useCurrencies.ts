import { useState, useEffect, useCallback } from 'react';
import { Currency } from '../types';
import { currenciesApi } from '../services/api';

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrencies = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await currenciesApi.list();
      setCurrencies(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrencies(); }, [fetchCurrencies]);

  const createCurrency = async (data: { code: string; name: string; symbol: string; isDefault?: boolean }) => {
    const result = await currenciesApi.create(data);
    await fetchCurrencies();
    return result;
  };

  const updateCurrency = async (id: string, data: { code: string; name: string; symbol: string; isDefault?: boolean }) => {
    const result = await currenciesApi.update(id, data);
    await fetchCurrencies();
    return result;
  };

  const deleteCurrency = async (id: string) => {
    const result = await currenciesApi.delete(id);
    await fetchCurrencies();
    return result;
  };

  return { currencies, isLoading, fetchCurrencies, createCurrency, updateCurrency, deleteCurrency };
}
