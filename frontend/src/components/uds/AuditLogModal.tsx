import React from 'react';
import { UdsCard, UdsButton } from './UdsComponents';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useI18n } from '../../i18n/I18nContext';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: string;
  title?: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose, resource, title }) => {
  const { t } = useI18n();
  const { logs, isLoading, fetchLogs } = useAuditLogs();
  const tr = (key: string, fallback: string) => {
    const fn = t as any;
    return typeof fn === 'function' ? fn(key) ?? fallback : fallback;
  };
  const auditLabel = tr('auditLog', '审计日志');
  const refreshLabel = tr('refresh', '刷新');
  const closeLabel = tr('cancel', '关闭');
  const loadingLabel = tr('loading', '加载中');
  const noDataLabel = tr('noData', '暂无审计记录');
  const dateColLabel = tr('dateCol', '时间');
  const userColLabel = tr('user', '用户');
  const actionColLabel = tr('action', '动作');
  const statusColLabel = tr('status', '状态');
  const durationColLabel = tr('duration', '耗时(ms)');

  React.useEffect(() => {
    if (isOpen) {
      fetchLogs({ resource, take: 200 });
    }
  }, [isOpen, resource, fetchLogs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-[90vw] max-w-[1400px] h-[75vh] flex flex-col animate-uds-fade">
        <UdsCard
          title={title || auditLabel}
          action={
            <div className="flex items-center gap-2">
              <UdsButton
                variant="ghost"
                className="h-8 px-3 text-[10px] font-black uppercase"
                onClick={() => fetchLogs({ resource, take: 200 })}
              >
                {refreshLabel}
              </UdsButton>
              <UdsButton
                variant="ghost"
                className="h-8 px-3 text-[10px] font-black uppercase"
                onClick={onClose}
              >
                {closeLabel}
              </UdsButton>
            </div>
          }
          className="h-full flex flex-col"
        >
          <div className="flex-1 overflow-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">
                {loadingLabel}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[10px] font-black uppercase tracking-widest text-neutral-600">
                {noDataLabel}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/10">
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 pl-2">{dateColLabel}</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">{userColLabel}</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">{actionColLabel}</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-center">{statusColLabel}</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3">PATH</th>
                    <th className="text-[10px] font-black uppercase tracking-widest text-neutral-500 pb-3 text-right pr-2">{durationColLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-solid border-white/5 hover:bg-white/2 transition-all text-xs">
                      <td className="py-3.5 pl-2 text-[9px] font-mono text-neutral-500">
                        {new Date(log.createdAt).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-neutral-200">{log.usernameSnapshot || '-'}</span>
                          <span className="text-[9px] font-mono text-neutral-600">{log.userId || ''}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs text-neutral-200 font-semibold">{log.action}</span>
                          <span className="text-[9px] text-neutral-500 font-mono">{log.resource}{log.resourceId ? ` #${log.resourceId}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-center font-mono text-[11px]">
                        <span className={log.status >= 400 ? 'text-rose-400' : 'text-emerald-400'}>{log.status}</span>
                      </td>
                      <td className="py-3.5 text-[10px] text-neutral-300 font-mono max-w-[260px] truncate" title={log.path}>
                        {log.path}
                      </td>
                      <td className="py-3.5 text-right pr-2 text-[10px] font-mono text-neutral-400">
                        {log.durationMs ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </UdsCard>
      </div>
    </div>
  );
};
