import React from 'react';
import { UdsButton } from '../uds/UdsComponents';
import type { Counterparty, CounterpartyRoleType } from '../../types';
import { CounterpartyForm } from './CounterpartyForm';

interface CounterpartyFormPayload {
  name: string;
  roleType: CounterpartyRoleType;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
}

interface CounterpartyFormModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: Counterparty | null;
  defaultRole: 'customer' | 'supplier';
  onSubmit: (payload: CounterpartyFormPayload) => Promise<void>;
  onClose: () => void;
}

export const CounterpartyFormModal: React.FC<CounterpartyFormModalProps> = ({
  isOpen,
  title,
  initialValue,
  defaultRole,
  onSubmit,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl">
        <CounterpartyForm
          title={title}
          initialValue={initialValue}
          defaultRole={defaultRole}
          onSubmit={onSubmit}
          onCancel={onClose}
          action={
            <UdsButton type="button" variant="ghost" onClick={onClose} className="h-7 px-3">
              Cancel
            </UdsButton>
          }
        />
      </div>
    </div>
  );
};
