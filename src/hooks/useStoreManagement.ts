
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      console.log('Fetching store records from Firebase...');
      
      const recordsQuery = query(collection(db, 'coffee_records'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(recordsQuery);
      
      console.log('Raw Firebase documents:', querySnapshot.size);
      
      const transformedRecords: StoreRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Document data:', data);
        
        return {
          id: doc.id,
          supplierName: data.supplier_name || '',
          coffeeType: data.coffee_type || '',
          bags: data.bags || 0,
          kilograms: data.kilograms || 0,
          date: data.date || '',
          batchNumber: data.batch_number || '',
          status: data.status || 'pending'
        };
      });

      console.log('Transformed records:', transformedRecords);
      setStoreRecords(transformedRecords);
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

  const addSupplier = async (supplierData: any) => {
    try {
      const supplierDoc = {
        name: supplierData.name,
        origin: supplierData.location,
        phone: supplierData.phone,
        code: `SUP${Date.now()}`,
        opening_balance: 0,
        date_registered: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'suppliers'), supplierDoc);
      
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

  const addCoffeeRecord = async (recordData: Omit<StoreRecord, 'id'>) => {
    try {
      const coffeeDoc = {
        supplier_name: recordData.supplierName,
        coffee_type: recordData.coffeeType,
        bags: recordData.bags,
        kilograms: recordData.kilograms,
        date: recordData.date,
        batch_number: recordData.batchNumber,
        status: recordData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'coffee_records'), coffeeDoc);
      await fetchStoreData();
      
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
      await updateDoc(doc(db, 'coffee_records', recordId), {
        status,
        updated_at: new Date().toISOString()
      });

      await fetchStoreData();
      
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
  }, []);

  return {
    storeRecords,
    loading,
    fetchStoreData,
    suppliers: [],
    coffeeRecords: storeRecords,
    addSupplier,
    addCoffeeRecord,
    updateCoffeeRecordStatus,
    todaysSummary: getTodaysSummary(),
    pendingActions: getPendingActions()
  };
};
