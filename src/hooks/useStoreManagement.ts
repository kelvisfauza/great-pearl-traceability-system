
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StoreRecord {
  id: string;
  batchNumber: string;
  supplierName: string;
  coffeeType: string;
  bags: number;
  kilograms: number;
  date: string;
  status: string;
}

export const useStoreManagement = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching store records:', error);
        setStoreRecords([]);
        return;
      }

      const transformedRecords: StoreRecord[] = data.map(record => ({
        id: record.id,
        batchNumber: record.batch_number,
        supplierName: record.supplier_name,
        coffeeType: record.coffee_type,
        bags: record.bags,
        kilograms: record.kilograms,
        date: record.date,
        status: record.status
      }));

      setStoreRecords(transformedRecords);
    } catch (error) {
      console.error('Error fetching store records:', error);
      setStoreRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  return {
    storeRecords,
    loading,
    fetchStoreData
  };
};
