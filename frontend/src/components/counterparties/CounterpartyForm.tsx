import React, { useEffect, useMemo, useState } from 'react';
import { UdsButton, UdsCard, UdsInput } from '../uds/UdsComponents';
import type { Counterparty, CounterpartyRoleType } from '../../types';
import {
  buildRoleTypeFromSelection,
  hasCustomerCapability,
  hasSupplierCapability,
} from './counterpartyUtils';

interface CounterpartyFormPayload {
  name: string;
  roleType: CounterpartyRoleType;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  remarks: string | null;
}

interface CounterpartyFormProps {
  title: string;
  initialValue?: Counterparty | null;
  defaultRole: 'customer' | 'supplier';
  onSubmit: (payload: CounterpartyFormPayload) => Promise<void>;
  onCancel?: () => void;
  action?: React.ReactNode;
}

export const CounterpartyForm: React.FC<CounterpartyFormProps> = ({
  title,
  initialValue,
  defaultRole,
  onSubmit,
  onCancel,
  action,
}) => {
  const defaultRoleState = useMemo(() => {
    if (initialValue) {
      return {
        customer: hasCustomerCapability(initialValue.roleType),
        supplier: hasSupplierCapability(initialValue.roleType),
      };
    }

    return {
      customer: defaultRole === 'customer',
      supplier: defaultRole === 'supplier',
    };
  }, [defaultRole, initialValue]);

  const [name, setName] = useState(initialValue?.name ?? '');
  const [contactPerson, setContactPerson] = useState(initialValue?.contactPerson ?? '');
  const [phone, setPhone] = useState(initialValue?.phone ?? '');
  const [email, setEmail] = useState(initialValue?.email ?? '');
  const [address, setAddress] = useState(initialValue?.address ?? '');
  const [remarks, setRemarks] = useState(initialValue?.remarks ?? '');
  const [customerSelected, setCustomerSelected] = useState(defaultRoleState.customer);
  const [supplierSelected, setSupplierSelected] = useState(defaultRoleState.supplier);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleError, setRoleError] = useState('');

  const optionalValue = (value: string) => value.trim() || null;

  useEffect(() => {
    setName(initialValue?.name ?? '');
    setContactPerson(initialValue?.contactPerson ?? '');
    setPhone(initialValue?.phone ?? '');
    setEmail(initialValue?.email ?? '');
    setAddress(initialValue?.address ?? '');
    setRemarks(initialValue?.remarks ?? '');
    setCustomerSelected(defaultRoleState.customer);
    setSupplierSelected(defaultRoleState.supplier);
    setRoleError('');
  }, [defaultRoleState.customer, defaultRoleState.supplier, initialValue]);

  return (
    <UdsCard title={title} action={action}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setRoleError('');
          setIsSubmitting(true);

          try {
            await onSubmit({
              name: name.trim(),
              roleType: buildRoleTypeFromSelection(customerSelected, supplierSelected),
              contactPerson: optionalValue(contactPerson),
              phone: optionalValue(phone),
              email: optionalValue(email),
              address: optionalValue(address),
              remarks: optionalValue(remarks),
            });
          } catch (error) {
            if (error instanceof Error && error.message.includes('role')) {
              setRoleError(error.message);
            } else {
              throw error;
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <UdsInput
          label="往来主体名称"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <label className="flex h-12 items-center gap-2 sm:gap-3 rounded-2xl bg-[#1c1c1e]/50 px-3 sm:px-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={customerSelected}
              onChange={(event) => setCustomerSelected(event.target.checked)}
              className="h-4 w-4 accent-white"
            />
            <span>客户</span>
          </label>
          <label className="flex h-12 items-center gap-2 sm:gap-3 rounded-2xl bg-[#1c1c1e]/50 px-3 sm:px-4 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={supplierSelected}
              onChange={(event) => setSupplierSelected(event.target.checked)}
              className="h-4 w-4 accent-white"
            />
            <span>供应商</span>
          </label>
        </div>
        {roleError && <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">{roleError}</span>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UdsInput label="联系人" value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} />
          <UdsInput label="电话" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <UdsInput label="邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <UdsInput label="地址" value={address} onChange={(event) => setAddress(event.target.value)} />
          <UdsInput label="备注" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onCancel ? (
            <UdsButton type="button" variant="ghost" onClick={onCancel}>
              取消
            </UdsButton>
          ) : null}
          <UdsButton type="submit" disabled={isSubmitting || !name.trim()}>
            保存
          </UdsButton>
        </div>
      </form>
    </UdsCard>
  );
};
