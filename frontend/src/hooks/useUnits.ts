import { useState, useEffect, useCallback } from 'react';
import { unitsApi } from '../services/api';

export interface Unit {
  id: string;
  code: string;
  name: string;
}

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await unitsApi.list();
      setUnits(data);
    } catch {
      // 交给调用方处理错误
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const createUnit = async (data: { code: string; name: string }) => {
    const result = await unitsApi.create(data);
    await fetchUnits();
    return result;
  };

  const updateUnit = async (id: string, data: { code: string; name: string }) => {
    const result = await unitsApi.update(id, data);
    await fetchUnits();
    return result;
  };

  const deleteUnit = async (id: string) => {
    const result = await unitsApi.delete(id);
    await fetchUnits();
    return result;
  };

  return { units, isLoading, fetchUnits, createUnit, updateUnit, deleteUnit };
}
