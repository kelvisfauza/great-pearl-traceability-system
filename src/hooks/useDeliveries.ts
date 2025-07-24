
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
  grn: string;
  status: string;
  deliveryDate: string;
}

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      // For now, we'll use coffee_records as deliveries since we don't have a specific deliveries table
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deliveries:', error);
        setDeliveries([]);
        return;
      }

      const transformedDeliveries: Delivery[] = data.map(record => ({
        id: record.id,
        supplier: record.supplier_name,
        coffeeType: record.coffee_type,
        weight: record.bags,
        moistureContent: 12.5, // Default value since not in coffee_records
        defects: 'Low', // Default value
        pricePerBag: 7000, // Default value
        grn: record.batch_number,
        status: record.status === 'pending' ? 'Pending' : 'Approved',
        deliveryDate: record.date
      }));

      setDeliveries(transformedDeliveries);
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
