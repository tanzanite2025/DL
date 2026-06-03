import { useState, useCallback } from 'react';
import { AuditLog } from '../types';
import { auditApi } from '../services/api';

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(
    async (params: { resource?: string; action?: string; userId?: string; skip?: number; take?: number } = {}) => {
      setIsLoading(true);
      try {
        const data = await auditApi.list(params);
        setLogs(data.records || []);
        setTotal(data.total || 0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { logs, total, isLoading, fetchLogs };
}
