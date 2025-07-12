
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StoreRecord {
  id: string;
  supplierName: string;
  coffeeType: string;
  bags: number;
  kilograms: number;
  date: string;
  batchNumber: string;
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
        supplierName: record.supplier_name,
        coffeeType: record.coffee_type,
        bags: record.bags,
        kilograms: record.kilograms,
        date: record.date,
        batchNumber: record.batch_number,
        status: record.status
      }));

      setStoreRecords(transformedRecords);
    } catch (error) {
      console.error('Error fetching store data:', error);
      setStoreRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData: any) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplierData.name,
          origin: supplierData.location,
          phone: supplierData.phone,
          code: `SUP${Date.now()}`,
          opening_balance: 0
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  const addCoffeeRecord = async (recordData: Omit<StoreRecord, 'id'>) => {
    try {
      const { error } = await supabase
        .from('coffee_records')
        .insert([{
          supplier_name: recordData.supplierName,
          coffee_type: recordData.coffeeType,
          bags: recordData.bags,
          kilograms: recordData.kilograms,
          date: recordData.date,
          batch_number: recordData.batchNumber,
          status: recordData.status
        }]);

      if (error) throw error;
      await fetchStoreData();
    } catch (error) {
      console.error('Error adding coffee record:', error);
      throw error;
    }
  };

  const updateCoffeeRecordStatus = async (recordId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('coffee_records')
        .update({ status })
        .eq('id', recordId);

      if (error) throw error;
      await fetchStoreData();
    } catch (error) {
      console.error('Error updating coffee record status:', error);
      throw error;
    }
  };

  const getTodaysSummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaysRecords = storeRecords.filter(record => record.date === today);
    
    return {
      totalRecords: todaysRecords.length,
      totalBags: todaysRecords.reduce((sum, record) => sum + record.bags, 0),
      totalKilograms: todaysRecords.reduce((sum, record) => sum + record.kilograms, 0),
      pendingRecords: todaysRecords.filter(record => record.status === 'pending').length,
      // Add backward compatibility properties
      totalReceived: todaysRecords.reduce((sum, record) => sum + record.bags, 0),
      activeSuppliers: new Set(todaysRecords.map(r => r.supplierName)).size
    };
  };

  const getPendingActions = () => {
    const pendingRecords = storeRecords.filter(record => record.status === 'pending').slice(0, 5);
    
    return {
      ...pendingRecords,
      qualityReview: pendingRecords.filter(r => r.status === 'pending').length,
      awaitingPricing: pendingRecords.filter(r => r.status === 'assessed').length,
      readyForDispatch: pendingRecords.filter(r => r.status === 'approved').length
    };
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  return {
    storeRecords,
    loading,
    fetchStoreData,
    // Legacy aliases for backward compatibility
    suppliers: [], // This would need to be fetched separately if needed
    coffeeRecords: storeRecords,
    addSupplier,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    todaysSummary: getTodaysSummary(),
    pendingActions: getPendingActions()
  };
};
