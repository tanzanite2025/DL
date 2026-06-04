import React from 'react';

interface SecureMoneyProps {
  value: number | null | undefined;
  symbol?: string;
  canView: boolean;
  className?: string;
}

export const SecureMoney: React.FC<SecureMoneyProps> = ({
  value,
  symbol = '',
  canView,
  className = '',
}) => {
  if (!canView) {
    return <span className={className}>***</span>;
  }

  const num = value ?? 0;

  return (
    <span className={className}>
      {symbol}
      {num.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </span>
  );
};
