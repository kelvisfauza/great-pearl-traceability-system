
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Delivery {
  id: string;
  supplier: string;
  coffeeType: string;
  weight: number;
  moistureContent: number;
  defects: string;
  pricePerBag: number;
  status: string;
  deliveryDate: string;
  grn: string;
}

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // For now, we'll return empty array since deliveries table doesn't exist yet
      // This prevents errors while maintaining the interface
      setDeliveries([]);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  return {
    deliveries,
    loading,
    fetchDeliveries
  };
};
