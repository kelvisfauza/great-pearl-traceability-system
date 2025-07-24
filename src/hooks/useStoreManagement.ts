import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';

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

export interface Supplier {
  id: string;
  name: string;
  origin: string;
  phone: string;
  code: string;
  opening_balance: number;
  date_registered: string;
}

export const useStoreManagement = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getActiveContractForSupplier } = useSupplierContracts();

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      console.log('Fetching store records...');
      
      // Mock data since coffee_records table doesn't exist yet
      const mockStoreRecords: StoreRecord[] = [];

      console.log('Store records loaded:', mockStoreRecords.length);
      setStoreRecords(mockStoreRecords);
    } catch (error) {
      console.error('Error fetching store data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch store records",
        variant: "destructive"
      });
      setStoreRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      
      // Mock data since suppliers table doesn't exist yet
      const mockSuppliers: Supplier[] = [];

      console.log('Suppliers loaded:', mockSuppliers.length);
      setSuppliers(mockSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
        variant: "destructive"
      });
    }
  };

  const addSupplier = async (supplierData: any) => {
    try {
      console.log('Adding supplier:', supplierData);
      
      const newSupplier: Supplier = {
        id: `sup-${Date.now()}`,
        name: supplierData.name,
        origin: supplierData.location,
        phone: supplierData.phone,
        code: `SUP${Date.now()}`,
        opening_balance: 0,
        date_registered: new Date().toISOString()
      };

      setSuppliers(prev => [newSupplier, ...prev]);
      
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
      
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateCoffeeRecord = async (recordId: string, recordData: Partial<Omit<StoreRecord, 'id'>>) => {
    try {
      console.log('Updating coffee record:', recordId, recordData);
      
      setStoreRecords(prev => 
        prev.map(record => 
          record.id === recordId ? { ...record, ...recordData } : record
        )
      );
      
      toast({
        title: "Success",
        description: "Coffee record updated successfully"
      });
    } catch (error) {
      console.error('Error updating coffee record:', error);
      toast({
        title: "Error",
        description: "Failed to update coffee record",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteCoffeeRecord = async (recordId: string) => {
    try {
      console.log('Deleting coffee record:', recordId);
      
      setStoreRecords(prev => prev.filter(record => record.id !== recordId));
      
      toast({
        title: "Success",
        description: "Coffee record deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting coffee record:', error);
      toast({
        title: "Error",
        description: "Failed to delete coffee record",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addCoffeeRecord = async (recordData: Omit<StoreRecord, 'id'>) => {
    try {
      console.log('Adding coffee record:', recordData);
      
      const newRecord: StoreRecord = {
        id: `record-${Date.now()}`,
        ...recordData
      };

      setStoreRecords(prev => [newRecord, ...prev]);
      
      toast({
        title: "Success",
        description: "Coffee record added successfully"
      });
    } catch (error) {
      console.error('Error adding coffee record:', error);
      toast({
        title: "Error",
        description: "Failed to add coffee record",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateCoffeeRecordStatus = async (recordId: string, status: string) => {
    try {
      console.log('Updating coffee record status:', recordId, status);
      
      setStoreRecords(prev => 
        prev.map(record => 
          record.id === recordId ? { ...record, status } : record
        )
      );
      
      toast({
        title: "Success",
        description: "Record status updated successfully"
      });
    } catch (error) {
      console.error('Error updating coffee record status:', error);
      toast({
        title: "Error",
        description: "Failed to update record status",
        variant: "destructive"
      });
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
      totalReceived: todaysRecords.reduce((sum, record) => sum + record.bags, 0),
      activeSuppliers: new Set(todaysRecords.map(r => r.supplierName)).size
    };
  };

  const getPendingActions = () => {
    const pendingRecords = storeRecords.filter(record => record.status === 'pending').slice(0, 5);
    
    return {
      ...pendingRecords,
      qualityReview: pendingRecords.filter(r => r.status === 'pending').length,
      awaitingPricing: storeRecords.filter(r => r.status === 'assessed').length,
      readyForDispatch: storeRecords.filter(r => r.status === 'approved').length
    };
  };

  useEffect(() => {
    fetchStoreData();
    fetchSuppliers();
  }, []);

  return {
    storeRecords,
    loading,
    fetchStoreData,
    suppliers,
    coffeeRecords: storeRecords,
    addSupplier,
    addCoffeeRecord,
    updateCoffeeRecord,
    deleteCoffeeRecord,
    updateCoffeeRecordStatus,
    todaysSummary: getTodaysSummary(),
    pendingActions: getPendingActions()
  };
};