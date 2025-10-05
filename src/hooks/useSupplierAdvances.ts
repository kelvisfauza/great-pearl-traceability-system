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
    console.log('📊 Getting outstanding for supplier ID:', supplierId);
    console.log('📋 All advances:', advances?.map(a => ({ 
      supplier_id: a.supplier_id, 
      outstanding: a.outstanding_ugx 
    })));
    if (!advances) return 0;
    const filtered = advances.filter(adv => adv.supplier_id === supplierId);
    console.log('✅ Filtered advances:', filtered);
    return filtered.reduce((sum, adv) => sum + Number(adv.outstanding_ugx), 0);
  };

  return {
    advances: advances || [],
    loading: isLoading,
    refetch,
    getTotalOutstanding,
  };
};
