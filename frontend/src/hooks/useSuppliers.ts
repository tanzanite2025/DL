import { useCounterparties } from './useCounterparties';

export function useSuppliers() {
  const {
    counterparties,
    isLoading,
    fetchCounterparties,
    createCounterparty,
    updateCounterparty,
    deleteCounterparty,
  } = useCounterparties('supplier');

  return {
    suppliers: counterparties,
    isLoading,
    fetchSuppliers: fetchCounterparties,
    createSupplier: createCounterparty,
    updateSupplier: updateCounterparty,
    deleteSupplier: deleteCounterparty,
  };
}
