import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      let query = supabase
        .from('supplier_advances')
        .select('*')
        .eq('is_closed', false)
        .order('issued_at', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SupplierAdvance[];
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
