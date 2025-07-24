
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SupplierContract {
  id: string;
  supplierName: string;
  supplierId: string;
  contractType: string;
  date: string;
  kilogramsExpected: number;
  pricePerKg: number;
  advanceGiven: number;
  status: string;
  created_at: string;
}

export const useSupplierContracts = () => {
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const contractsQuery = query(
        collection(db, 'supplier_contracts'),
        orderBy('created_at', 'desc')
      );
      
      const contractsSnapshot = await getDocs(contractsQuery);
      const contractsData = contractsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierContract[];

      setContracts(contractsData);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const getActiveContractForSupplier = (supplierId: string): SupplierContract | null => {
    return contracts.find(contract => 
      contract.supplierId === supplierId && contract.status === 'Active'
    ) || null;
  };

  const getContractPriceForSupplier = (supplierId: string): number | null => {
    const contract = getActiveContractForSupplier(supplierId);
    return contract ? contract.pricePerKg : null;
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    fetchContracts,
    getActiveContractForSupplier,
    getContractPriceForSupplier
  };
};
