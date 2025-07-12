
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

export interface Supplier extends Tables<'suppliers'> {}
export interface CoffeeRecord extends Tables<'coffee_records'> {}

export const useStoreManagement = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffeeRecords, setCoffeeRecords] = useState<CoffeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliersError) throw suppliersError;

      // Load coffee records
      const { data: recordsData, error: recordsError } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      setSuppliers(suppliersData || []);
      setCoffeeRecords(recordsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSupplierCode = async () => {
    const { count } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });
    
    const nextNumber = (count || 0) + 1;
    return `GPCS${nextNumber.toString().padStart(4, '0')}`;
  };

  const addSupplier = async (supplierData: Omit<TablesInsert<'suppliers'>, 'code'>) => {
    try {
      const code = await generateSupplierCode();
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          ...supplierData,
          code
        })
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  const generateBatchNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const recordCount = coffeeRecords.length + 1;
    return `B${year}${month}${day}${recordCount.toString().padStart(2, '0')}`;
  };

  const addCoffeeRecord = async (recordData: Omit<TablesInsert<'coffee_records'>, 'batch_number'>) => {
    try {
      // Find the supplier to get the supplier_id
      const supplier = suppliers.find(s => s.name === recordData.supplier_name);
      
      const { data, error } = await supabase
        .from('coffee_records')
        .insert({
          ...recordData,
          supplier_id: supplier?.id || null,
          batch_number: generateBatchNumber()
        })
        .select()
        .single();

      if (error) throw error;

      setCoffeeRecords(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding coffee record:', error);
      throw error;
    }
  };

  const updateCoffeeRecordStatus = async (recordId: string, newStatus: CoffeeRecord['status']) => {
    try {
      const { data, error } = await supabase
        .from('coffee_records')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;

      setCoffeeRecords(prev => 
        prev.map(record => 
          record.id === recordId ? data : record
        )
      );
    } catch (error) {
      console.error('Error updating coffee record status:', error);
      throw error;
    }
  };

  // Calculate today's summary
  const todaysSummary = {
    totalReceived: coffeeRecords
      .filter(record => record.date === new Date().toISOString().split('T')[0])
      .reduce((sum, record) => sum + Number(record.kilograms), 0),
    totalBags: coffeeRecords
      .filter(record => record.date === new Date().toISOString().split('T')[0])
      .reduce((sum, record) => sum + record.bags, 0),
    activeSuppliers: suppliers.length
  };

  // Calculate pending actions
  const pendingActions = {
    qualityReview: coffeeRecords.filter(record => record.status === 'quality_review').length,
    awaitingPricing: coffeeRecords.filter(record => record.status === 'pricing').length,
    readyForDispatch: coffeeRecords.filter(record => record.status === 'batched').length
  };

  return {
    suppliers,
    coffeeRecords,
    loading,
    addSupplier,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    generateSupplierCode,
    todaysSummary,
    pendingActions,
    refreshData: loadData
  };
};
