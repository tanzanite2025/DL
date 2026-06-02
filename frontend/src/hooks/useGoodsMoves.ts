import { useState, useEffect, useCallback } from 'react';
import { GoodsMove } from '../types';
import { goodsMovesApi } from '../services/api';

export function useGoodsMoves() {
  const [moves, setMoves] = useState<GoodsMove[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMoves = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await goodsMovesApi.list();
      setMoves(data);
    } catch {
      // error handled by caller
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMoves(); }, [fetchMoves]);

  const createMove = async (data: any) => {
    const result = await goodsMovesApi.create(data);
    await fetchMoves();
    return result;
  };

  return { moves, isLoading, fetchMoves, createMove };
}
