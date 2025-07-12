
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
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .eq('status', 'delivered')
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
        moistureContent: 12.5, // Default moisture content
        defects: 'None', // Default defects
        pricePerBag: Math.round(7000 + Math.random() * 1000), // Random price between 7000-8000
        status: 'Quality Check',
        deliveryDate: record.date,
        grn: record.batch_number
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
