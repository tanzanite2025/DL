import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UdsHeader, UdsCard, UdsButton } from '../components/uds/UdsComponents';
import { AuditLogModal } from '../components/uds/AuditLogModal';
import { useCustomers } from '../hooks/useCustomers';
import { useItems } from '../hooks/useItems';
import { useWarehouses } from '../hooks/useWarehouses';
import { useAfterSalesCases } from '../hooks/useAfterSalesCases';
import { AfterSalesCase, ShowToast } from '../types';
import { AfterSalesCaseModal } from '../components/afterSales/AfterSalesCaseModal';

interface AfterSalesManagementProps {
  token: string;
  showToast: ShowToast;
}

export const AfterSalesManagement: React.FC<AfterSalesManagementProps> = ({ showToast }) => {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const { items } = useItems();
  const { warehouses } = useWarehouses();
  const { cases, isLoading, createCase, updateCase, deleteCase } = useAfterSalesCases();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<AfterSalesCase | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const handleOpenCreate = () => {
    setEditingCase(null);
    setIsModalOpen(true);
  };

  const handleStartEdit = (c: AfterSalesCase) => {
    setEditingCase(c);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCase(null);
  };

  const handleModalSubmit = async (values: {
    customerId: string;
    shipFromAddress: string;
    itemId: string;
    warehouseId: string;
    qty: string;
    shipmentTrackingNumber: string;
    type: 'REPAIR' | 'RETURN' | 'EXCHANGE';
    processedDate: string;
    shipBackAddress: string;
    note: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';
  }) => {
    const parsedQty = parseInt(values.qty || '1', 10);

    const payload: any = {
      customerId: values.customerId,
      itemId: values.itemId,
      type: values.type,
      customerAddressSnapshot: values.shipFromAddress || null,
      warehouseId: values.warehouseId || null,
      qty: Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1,
      shipmentTrackingNumber: values.shipmentTrackingNumber || null,
      processedDate: values.processedDate || null,
      shipBackAddress: values.shipBackAddress || null,
      note: values.note || null,
      status: values.status,
    };

    if (editingCase) {
      await updateCase(editingCase.id, payload);
      showToast('售后记录已更新', 'success');
    } else {
      await createCase(payload);
      showToast('售后记录已创建', 'success');
    }

    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该售后记录吗？')) return;
    try {
      await deleteCase(id);
      showToast('售后记录已删除', 'success');
    } catch (error: any) {
      showToast(error.message || '删除售后记录失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <UdsHeader
        title="售后管理"
        description="登记并跟踪返修 / 退货 / 换货记录，关联客户与产品。"
        actions={
          <div className="flex gap-2">
            <UdsButton className="h-9 px-4 text-[10px]" onClick={handleOpenCreate}>
              添加售后
            </UdsButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-8 items-start">
        <div className="w-full">
          <UdsCard title="售后记录列表">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 animate-pulse">
                  加载中...
                </span>
              </div>
            ) : cases.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  暂无售后记录
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-2">收到日期</th>
                      <th className="py-2 pr-2">客户</th>
                      <th className="py-2 pr-2">寄出地址</th>
                      <th className="py-2 pr-2">产品</th>
                      <th className="py-2 pr-2">数量</th>
                      <th className="py-2 pr-2">寄出单号</th>
                      <th className="py-2 pr-2">退回仓库</th>
                      <th className="py-2 pr-2">类型</th>
                      <th className="py-2 pr-2">售后日期</th>
                      <th className="py-2 pr-2">寄回地址</th>
                      <th className="py-2 pr-2">备注</th>
                      <th className="py-2 pr-2">经手人</th>
                      <th className="py-2 pr-2">库存记录</th>
                      <th className="py-2 pr-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map(c => (
                      <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.receivedDate.slice(0, 10)}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.customer?.name}</td>
                        <td className="py-1.5 pr-2 max-w-[160px] truncate" title={c.customerAddressSnapshot || ''}>{c.customerAddressSnapshot}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.item?.name}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.qty}</td>
                        <td className="py-1.5 pr-2 max-w-[160px] truncate" title={c.shipmentTrackingNumber || ''}>{c.shipmentTrackingNumber}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.warehouse?.name ?? ''}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {c.type === 'REPAIR' ? '返修' : c.type === 'RETURN' ? '退货' : '换货'}
                        </td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.processedDate ? c.processedDate.slice(0, 10) : ''}</td>
                        <td className="py-1.5 pr-2 max-w-[160px] truncate" title={c.shipBackAddress || ''}>{c.shipBackAddress}</td>
                        <td className="py-1.5 pr-2 max-w-[160px] truncate" title={c.note || ''}>{c.note}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{c.handlerName || ''}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {c.goodsMoveId ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/goods?moveId=${c.goodsMoveId}`)}
                              className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 underline decoration-dotted"
                            >
                              {c.goodsMoveId.slice(0, 8)}
                            </button>
                          ) : (
                            ''
                          )}
                        </td>
                        <td className="py-1.5 pr-2 text-right flex gap-2 justify-end">
                          <UdsButton
                            type="button"
                            variant="ghost"
                            className="h-7 px-3 text-[9px]"
                            onClick={() => handleStartEdit(c)}
                          >
                            编辑
                          </UdsButton>
                          <UdsButton
                            type="button"
                            variant="critical"
                            className="h-7 px-3 text-[9px]"
                            onClick={() => handleDelete(c.id)}
                          >
                            删除
                          </UdsButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </UdsCard>
        </div>
      </div>

      <AfterSalesCaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        customers={customers}
        items={items}
        warehouses={warehouses}
        initialCase={editingCase}
        onSubmit={handleModalSubmit}
        showToast={showToast}
      />

      {/* 浮动审计按钮：固定在页面右下角 */}
      <div className="fixed bottom-24 right-[2.5%] z-30">
        <UdsButton
          variant="ghost"
          className="h-9 px-4 text-[10px] font-black uppercase shadow-lg bg-black/70 border border-white/10"
          onClick={() => setIsAuditOpen(true)}
        >
          审计日志
        </UdsButton>
      </div>

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        resource="after-sales"
        title="售后审计"
      />
    </div>
  );
};
