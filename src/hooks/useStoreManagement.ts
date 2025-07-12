
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone?: string;
  origin: string;
  openingBalance: number;
  dateRegistered: string;
}

export interface CoffeeRecord {
  id: string;
  coffeeType: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier: string;
  status: 'pending' | 'quality_review' | 'pricing' | 'batched' | 'drying' | 'sales' | 'inventory';
  batchNumber?: string;
}

export const useStoreManagement = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [coffeeRecords, setCoffeeRecords] = useState<CoffeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // For now, we'll use local state since we don't have database tables yet
  // This will be replaced with actual database calls once tables are created
  useEffect(() => {
    // Simulate loading from database
    setLoading(false);
  }, []);

  const generateSupplierCode = () => {
    const nextNumber = suppliers.length + 1;
    return `GPCS${nextNumber.toString().padStart(4, '0')}`;
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'code' | 'dateRegistered'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: Date.now().toString(),
      code: generateSupplierCode(),
      dateRegistered: new Date().toISOString().split('T')[0]
    };
    setSuppliers([...suppliers, newSupplier]);
    return newSupplier;
  };

  const addCoffeeRecord = (recordData: Omit<CoffeeRecord, 'id' | 'status' | 'batchNumber'>) => {
    const newRecord: CoffeeRecord = {
      ...recordData,
      id: Date.now().toString(),
      status: 'pending',
      batchNumber: `B${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${(coffeeRecords.length + 1).toString().padStart(2, '0')}`
    };
    setCoffeeRecords([...coffeeRecords, newRecord]);
    return newRecord;
  };

  const updateCoffeeRecordStatus = (recordId: string, newStatus: CoffeeRecord['status']) => {
    setCoffeeRecords(records => 
      records.map(record => 
        record.id === recordId ? { ...record, status: newStatus } : record
      )
    );
  };

  // Calculate today's summary
  const todaysSummary = {
    totalReceived: coffeeRecords
      .filter(record => record.date === new Date().toISOString().split('T')[0])
      .reduce((sum, record) => sum + record.kilograms, 0),
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
    pendingActions
  };
};
