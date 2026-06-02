import { useState, useEffect, useCallback } from 'react';
import { Item } from '../types';
import { itemsApi } from '../services/api';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await itemsApi.list();
      setItems(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const createItem = async (data: { name: string; unit?: string; description?: string }) => {
    const result = await itemsApi.create(data);
    await fetchItems();
    return result;
  };

  const updateItem = async (id: string, data: { code: string; name: string; unit: string; description?: string }) => {
    const result = await itemsApi.update(id, data);
    await fetchItems();
    return result;
  };

  const deleteItem = async (id: string) => {
    const result = await itemsApi.delete(id);
    await fetchItems();
    return result;
  };

  return { items, isLoading, fetchItems, createItem, updateItem, deleteItem };
}
