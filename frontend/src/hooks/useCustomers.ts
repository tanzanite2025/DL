import { useCounterparties } from './useCounterparties';

export function useCustomers() {
  const {
    counterparties,
    isLoading,
    fetchCounterparties,
    createCounterparty,
    updateCounterparty,
    deleteCounterparty,
  } = useCounterparties('customer');

  return {
    customers: counterparties,
    isLoading,
    fetchCustomers: fetchCounterparties,
    createCustomer: createCounterparty,
    updateCustomer: updateCounterparty,
    deleteCustomer: deleteCounterparty,
  };
}
