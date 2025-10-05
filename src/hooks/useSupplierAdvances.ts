import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SupplierAdvance {
  id: string;
  supplier_id: string;
  supplier_code?: string;
  supplier_name?: string;
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
      let q;
      
      if (supplierId) {
        // Get all advances for specific supplier (including closed ones)
        q = query(
          collection(db, 'supplier_advances'),
          where('supplier_id', '==', supplierId),
          orderBy('issued_at', 'desc')
        );
      } else {
        // Get all advances (including closed ones) for the advances management page
        q = query(
          collection(db, 'supplier_advances'),
          orderBy('issued_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => {
          const data = doc.data() as any;
          if (!data) return null;
          return {
            id: doc.id,
            supplier_id: data.supplier_id || '',
            supplier_code: data.supplier_code,
            supplier_name: data.supplier_name,
            amount_ugx: data.amount_ugx || 0,
            outstanding_ugx: data.outstanding_ugx || 0,
            issued_by: data.issued_by || '',
            issued_at: data.issued_at || '',
            description: data.description || '',
            is_closed: data.is_closed || false,
          } as SupplierAdvance;
        })
        .filter((adv): adv is SupplierAdvance => adv !== null);
    },
    enabled: true,
  });

  const getTotalOutstanding = (supplierId: string, supplierCode?: string) => {
    console.log('📊 Getting outstanding for supplier:', { supplierId, supplierCode });
    console.log('📋 All advances:', advances?.map(a => ({ 
      supplier_id: a.supplier_id,
      supplier_code: a.supplier_code,
      outstanding: a.outstanding_ugx 
    })));
    if (!advances) return 0;
    
    // Match by supplier ID or supplier code for more flexible matching
    const filtered = advances.filter(adv => 
      adv.supplier_id === supplierId || 
      (supplierCode && adv.supplier_code === supplierCode)
    );
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
