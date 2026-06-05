import React, { useEffect, useState } from 'react';
import { UdsButton, UdsInput, UdsSelect, UdsCard } from '../uds/UdsComponents';
import { CounterpartyPicker } from '../counterparties/CounterpartyPicker';
import { AfterSalesCase, Counterparty, Item, ShowToast, Warehouse } from '../../types';

interface AfterSalesCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  counterparties: Counterparty[];
  items: Item[];
  initialCase: AfterSalesCase | null;
  onSubmit: (values: {
    counterpartyId: string;
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
  }) => Promise<void>;
  showToast: ShowToast;
  warehouses: Warehouse[];
}

export const AfterSalesCaseModal: React.FC<AfterSalesCaseModalProps> = ({
  isOpen,
  onClose,
  counterparties,
  items,
  initialCase,
  onSubmit,
  showToast,
  warehouses,
}) => {
  const [counterpartyId, setCounterpartyId] = useState('');
  const [shipFromAddress, setShipFromAddress] = useState('');
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [qty, setQty] = useState('1');
  const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState('');
  const [type, setType] = useState<'REPAIR' | 'RETURN' | 'EXCHANGE'>('REPAIR');
  const [processedDate, setProcessedDate] = useState('');
  const [shipBackAddress, setShipBackAddress] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CLOSED'>('PENDING');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialCase) {
      setCounterpartyId(initialCase.counterpartyId);
      setShipFromAddress(initialCase.customerAddressSnapshot || '');
      setItemId(initialCase.itemId);
      setWarehouseId(initialCase.warehouseId || '');
      setQty(String(initialCase.qty ?? 1));
      setShipmentTrackingNumber(initialCase.shipmentTrackingNumber || '');
      setType(initialCase.type);
      setProcessedDate(initialCase.processedDate ? initialCase.processedDate.slice(0, 10) : '');
      setShipBackAddress(initialCase.shipBackAddress || '');
      setNote(initialCase.note || '');
      setStatus(initialCase.status);
    } else {
      setCounterpartyId('');
      setShipFromAddress('');
      setItemId('');
      setWarehouseId('');
      setQty('1');
      setShipmentTrackingNumber('');
      setType('REPAIR');
      setProcessedDate('');
      setShipBackAddress('');
      setNote('');
      setStatus('PENDING');
    }
  }, [isOpen, initialCase]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterpartyId || !itemId || !warehouseId) {
      showToast('客户 / 产品 / 退回仓库 不能为空', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        counterpartyId,
        shipFromAddress,
        itemId,
        warehouseId,
        qty,
        shipmentTrackingNumber,
        type,
        processedDate,
        shipBackAddress,
        note,
        status,
      });
    } catch (error: any) {
      showToast(error.message || '保存售后记录失败', 'error');
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = initialCase ? '编辑售后记录' : '登记售后记录';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl">
        <UdsCard title={title}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UdsInput
                label="数量"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <CounterpartyPicker
                label="瀹㈡埛"
                value={counterpartyId}
                counterparties={counterparties}
                onChange={setCounterpartyId}
                placeholder="璇烽€夋嫨瀹㈡埛"
                required
              />
              <UdsInput
                label="寄出地址"
                value={shipFromAddress}
                onChange={(e) => setShipFromAddress(e.target.value)}
              />
              <UdsInput
                label="寄出单号"
                value={shipmentTrackingNumber}
                onChange={(e) => setShipmentTrackingNumber(e.target.value)}
              />
              <UdsSelect
                label="产品"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                options={[
                  { value: '', label: '请选择产品' },
                  ...items.map(i => ({ value: i.id, label: i.name })),
                ]}
              />
              <UdsSelect
                label="退回仓库"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                options={[
                  { value: '', label: '请选择退回仓库' },
                  ...warehouses.map(w => ({ value: w.id, label: w.name })),
                ]}
              />
              <UdsSelect
                label="类型"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                options={[
                  { value: 'REPAIR', label: '返修' },
                  { value: 'RETURN', label: '退货' },
                  { value: 'EXCHANGE', label: '换货' },
                ]}
              />
              <UdsInput
                label="售后日期"
                type="date"
                value={processedDate}
                onChange={(e) => setProcessedDate(e.target.value)}
              />
              <UdsInput
                label="寄回地址"
                value={shipBackAddress}
                onChange={(e) => setShipBackAddress(e.target.value)}
              />
              <UdsInput
                label="备注"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <UdsSelect
                label="状态"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                options={[
                  { value: 'PENDING', label: '待处理' },
                  { value: 'IN_PROGRESS', label: '处理中' },
                  { value: 'DONE', label: '已完成' },
                  { value: 'CLOSED', label: '已关闭' },
                ]}
              />
            </div>

            <div className="flex justify-between gap-3 mt-2">
              <UdsButton
                type="button"
                variant="ghost"
                className="h-10 px-4 text-[10px]"
                onClick={onClose}
                disabled={isSubmitting}
              >
                关闭
              </UdsButton>
              <UdsButton
                type="submit"
                className="h-10 px-6 text-[10px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? '保存中...' : '保存'}
              </UdsButton>
            </div>
          </form>
        </UdsCard>
      </div>
    </div>
  );
};
