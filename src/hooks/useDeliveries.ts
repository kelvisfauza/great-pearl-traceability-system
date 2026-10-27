
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { savedDeliveryQuality, type DeliveryQuality } from '@/lib/deliveryQuality';

export interface Delivery {
  id: string;
  supplier: string;
  coffeeType: string;
  weight: number;
  kilograms: number;
  recordStatus: string;
  moistureContent: number | null;
  defects: string | null;
  pricePerKg: number | null;
  grn: string;
  status: string;
  deliveryDate: string;
}

export const useDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = [];
      for (let offset = 0; ; offset += 1000) {
        const { data: page, error: fetchError } = await supabase
          .from('coffee_records').select('*')
          .order('created_at', { ascending: false }).order('id')
          .range(offset, offset + 999);
        if (fetchError) throw fetchError;
        data.push(...(page ?? []));
        if (!page || page.length < 1000) break;
      }

      const assessments: DeliveryQuality[] = [];
      // Load by delivery IDs and legacy batch references in bounded, paginated requests.
      for (let offset = 0; offset < data.length; offset += 100) {
        const records = data.slice(offset, offset + 100);
        const ids = records.map(record => record.id).join(',');
        const batches = [...new Set(records.map(record => record.batch_number))]
          .filter(Boolean).map(batch => `"${batch.replace(/"/g, '\\"')}"`).join(',');
        for (let page = 0; ; page += 1000) {
          const { data: quality, error: qualityError } = await supabase
            .from('quality_assessments')
            .select('id,store_record_id,batch_number,moisture,final_price,suggested_price,calculator_price,group1_defects,group2_defects,fm,pods,husks,stones,updated_at')
            .or(`store_record_id.in.(${ids})${batches ? `,and(store_record_id.is.null,batch_number.in.(${batches}))` : ''}`)
            .order('id')
            .range(page, page + 999);
          if (qualityError) throw qualityError;
          assessments.push(...(quality ?? []));
          if (!quality || quality.length < 1000) break;
        }
      }
      const uniqueAssessments = [...new Map(assessments.map(a => [a.store_record_id ? `${a.store_record_id}:${a.updated_at}` : JSON.stringify(a), a])).values()];
      const transformedDeliveries: Delivery[] = data.map(record => ({
        id: record.id,
        supplier: record.supplier_name,
        coffeeType: record.coffee_type,
        weight: record.bags,
        kilograms: record.kilograms,
        recordStatus: record.status,
        ...savedDeliveryQuality(record, uniqueAssessments),
        grn: record.batch_number,
        status: record.status === 'pending' ? 'Pending' : 'Approved',
        deliveryDate: record.date
      }));

      setDeliveries(transformedDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError('Unable to load saved deliveries and quality prices.');
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
    error,
    fetchDeliveries
  };
};
