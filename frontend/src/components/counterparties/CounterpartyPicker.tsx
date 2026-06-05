import React from 'react';
import { UdsSelect } from '../uds/UdsComponents';
import type { Counterparty } from '../../types';
import { buildCounterpartyOptionLabel } from './counterpartyUtils';

interface CounterpartyPickerProps {
  label: string;
  value: string;
  counterparties: Counterparty[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export const CounterpartyPicker: React.FC<CounterpartyPickerProps> = ({
  label,
  value,
  counterparties,
  onChange,
  placeholder = 'Select counterparty',
  required = false,
  disabled = false,
}) => {
  return (
    <UdsSelect
      label={label}
      value={value}
      required={required}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      options={[
        { value: '', label: placeholder },
        ...counterparties.map((counterparty) => ({
          value: counterparty.id,
          label: buildCounterpartyOptionLabel(counterparty),
        })),
      ]}
    />
  );
};
