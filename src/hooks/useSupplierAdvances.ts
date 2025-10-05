import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SupplierAdvance {
  id: string;
  supplier_id: string;
  amount_ugx: number;
  outstanding_ugx: number;
  issued_by: string;
  issued_at: string;
  description: string;
  is_closed: boolean;
}

export const useSupplierAdvances = (supplierId?: string) => {
  const { data: advances, isLoading, refetch } = useQuery({
    queryKey: ['supplier-advances', supplierId],
    queryFn: async () => {
      let q = query(
        collection(db, 'supplier_advances'),
        where('is_closed', '==', false),
        orderBy('issued_at', 'desc')
      );

      if (supplierId) {
        q = query(
          collection(db, 'supplier_advances'),
          where('supplier_id', '==', supplierId),
          where('is_closed', '==', false),
          orderBy('issued_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupplierAdvance[];
    },
    enabled: true,
  });

  const getTotalOutstanding = (supplierId: string) => {
    if (!advances) return 0;
    return advances
      .filter(adv => adv.supplier_id === supplierId)
      .reduce((sum, adv) => sum + Number(adv.outstanding_ugx), 0);
  };

  return {
    advances: advances || [],
    loading: isLoading,
    refetch,
    getTotalOutstanding,
  };
};
