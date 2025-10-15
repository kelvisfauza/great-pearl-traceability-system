import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';
import { useNotifications } from '@/hooks/useNotifications';

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
  const { createAnnouncement } = useNotifications();

  const fetchStoreData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      console.log('Fetching store records from Firebase...');
      
      const recordsQuery = query(collection(db, 'coffee_records'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(recordsQuery);
      
      console.log('Raw Firebase documents:', querySnapshot.size);
      
      const transformedRecords: StoreRecord[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          supplierName: data.supplier_name || '',
          coffeeType: data.coffee_type || '',
          bags: Number(data.bags) || 0,
          kilograms: Number(data.kilograms) || 0,
          date: data.date || '',
          batchNumber: data.batch_number || '',
          status: data.status || 'pending'
        };
      });

      console.log('✅ Loaded records with statuses:', transformedRecords.map(r => ({ batch: r.batchNumber, status: r.status })));
      setStoreRecords(transformedRecords);
    } catch (error) {
      console.error('Error fetching store data:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to fetch store records",
          variant: "destructive"
        });
      }
      setStoreRecords([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers from Firebase...');
      
      const suppliersQuery = query(collection(db, 'suppliers'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(suppliersQuery);
      
      const transformedSuppliers: Supplier[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          origin: data.origin || '',
          phone: data.phone || '',
          code: data.code || '',
          opening_balance: Number(data.opening_balance) || 0,
          date_registered: data.date_registered || ''
        };
      });

      console.log('Suppliers loaded:', transformedSuppliers);
      setSuppliers(transformedSuppliers);
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
      console.log('Adding supplier to Firebase:', supplierData);
      
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

      const docRef = await addDoc(collection(db, 'suppliers'), supplierDoc);
      console.log('Supplier added with ID:', docRef.id);
      
      toast({
        title: "Success",
        description: "Supplier added successfully to database"
      });
      
      // Refresh suppliers list
      await fetchSuppliers();
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier to database",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateCoffeeRecord = async (recordId: string, recordData: Partial<Omit<StoreRecord, 'id'>>) => {
    try {
      console.log('🔄 Updating coffee record across all systems:', recordId, recordData);
      
      // Get the current record to know the batch number
      const currentRecord = storeRecords.find(r => r.id === recordId);
      if (!currentRecord) {
        throw new Error('Record not found');
      }
      
      const batchNumber = currentRecord.batchNumber;
      
      // 1. Update Firebase
      console.log('📝 Updating Firebase...');
      const docRef = doc(db, 'coffee_records', recordId);
      const firebaseUpdate = {
        supplier_name: recordData.supplierName,
        coffee_type: recordData.coffeeType,
        bags: recordData.bags,
        kilograms: recordData.kilograms,
        date: recordData.date,
        batch_number: recordData.batchNumber,
        status: recordData.status,
        updated_at: new Date().toISOString()
      };
      await updateDoc(docRef, firebaseUpdate);
      
      // 2. Update Supabase coffee_records by batch_number
      console.log('📝 Updating Supabase coffee_records...');
      const { supabase } = await import('@/integrations/supabase/client');
      const { error: supabaseError } = await supabase
        .from('coffee_records')
        .update({
          supplier_name: recordData.supplierName,
          coffee_type: recordData.coffeeType,
          bags: recordData.bags,
          kilograms: recordData.kilograms,
          date: recordData.date,
          batch_number: recordData.batchNumber,
          status: recordData.status
        })
        .eq('batch_number', batchNumber);
      
      if (supabaseError) {
        console.error('Supabase update error:', supabaseError);
      }
      
      // 3. Update quality_assessments (by batch_number and store_record_id)
      console.log('📝 Updating quality assessments...');
      const { error: qualityError } = await supabase
        .from('quality_assessments')
        .update({
          batch_number: recordData.batchNumber,
          kilograms: recordData.kilograms
        })
        .eq('batch_number', batchNumber);
      
      if (qualityError) {
        console.error('Quality assessment update error:', qualityError);
      }
      
      // Also try updating by store_record_id (Firebase ID)
      await supabase
        .from('quality_assessments')
        .update({
          batch_number: recordData.batchNumber,
          kilograms: recordData.kilograms
        })
        .eq('store_record_id', recordId);
      
      // 4. Update finance_coffee_lots (by batch number)
      console.log('📝 Updating finance coffee lots...');
      // First get the Supabase coffee_record IDs with this batch number
      const { data: supabaseCoffeeRecords } = await supabase
        .from('coffee_records')
        .select('id')
        .eq('batch_number', batchNumber);
      
      if (supabaseCoffeeRecords && supabaseCoffeeRecords.length > 0) {
        const coffeeRecordIds = supabaseCoffeeRecords.map(r => r.id);
        
        const { error: financeError } = await supabase
          .from('finance_coffee_lots')
          .update({
            quantity_kg: recordData.kilograms
          })
          .in('coffee_record_id', coffeeRecordIds);
        
        if (financeError) {
          console.error('Finance coffee lots update error:', financeError);
        }
      }

      await fetchStoreData();
      
      console.log('✅ Successfully updated record across all systems');
      toast({
        title: "Success",
        description: "Coffee record updated successfully in Store, Quality, and Finance"
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
      console.log('🗑️ Starting deletion process for record:', recordId);
      
      // Get the coffee record to check its batch number
      const coffeeRecord = storeRecords.find(record => record.id === recordId);
      if (!coffeeRecord) {
        toast({
          title: "Error",
          description: "Coffee record not found in current list",
          variant: "destructive"
        });
        return;
      }

      console.log('📋 Found record:', {
        batch: coffeeRecord.batchNumber,
        supplier: coffeeRecord.supplierName,
        kg: coffeeRecord.kilograms
      });

      const { supabase } = await import('@/integrations/supabase/client');

      // Check payment status in Firebase
      console.log('🔍 Checking Firebase payment records...');
      const paymentQuery = query(
        collection(db, 'payment_records'), 
        where('batch_number', '==', coffeeRecord.batchNumber)
      );
      const paymentSnapshot = await getDocs(paymentQuery);
      
      const paidPayments = paymentSnapshot.docs.filter(doc => {
        const data = doc.data();
        return ['Paid', 'paid', 'Processing', 'Approved', 'completed', 'Completed'].includes(data.status);
      });

      console.log(`Found ${paidPayments.length} paid payments in Firebase`);

      // Check Supabase payment_records
      console.log('🔍 Checking Supabase payment records...');
      const { data: supabasePayments } = await supabase
        .from('payment_records')
        .select('*')
        .eq('batch_number', coffeeRecord.batchNumber)
        .in('status', ['Paid', 'paid', 'Processing', 'Approved', 'completed', 'Completed']);

      console.log(`Found ${supabasePayments?.length || 0} paid payments in Supabase`);

      if (paidPayments.length > 0 || (supabasePayments && supabasePayments.length > 0)) {
        toast({
          title: "❌ Cannot Delete",
          description: `Payment has been processed for this batch (${coffeeRecord.batchNumber}). Contact Finance to reverse the payment first.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      // Check quality assessments in Firebase
      console.log('🔍 Checking Firebase quality assessments...');
      const qualityQuery = query(
        collection(db, 'quality_assessments'), 
        where('store_record_id', '==', recordId)
      );
      const qualitySnapshot = await getDocs(qualityQuery);
      
      const submittedQuality = qualitySnapshot.docs.filter(doc => {
        const data = doc.data();
        return ['submitted_to_finance', 'paid'].includes(data.status);
      });

      console.log(`Found ${submittedQuality.length} submitted quality assessments`);

      if (submittedQuality.length > 0) {
        toast({
          title: "❌ Cannot Delete",
          description: `Quality assessment has been submitted to Finance for batch ${coffeeRecord.batchNumber}. Please contact Quality department.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      console.log('✅ All checks passed, proceeding with deletion...');
      
      // DELETE FROM FIREBASE
      console.log('🔥 Deleting from Firebase...');
      const docRef = doc(db, 'coffee_records', recordId);
      await deleteDoc(docRef);
      console.log('✅ Deleted from Firebase');
      
      // DELETE FROM SUPABASE - Cascade through all related tables
      console.log('🗄️ Deleting from Supabase...');
      
      // 1. Delete quality assessments
      const { error: qaDeleteError } = await supabase
        .from('quality_assessments')
        .delete()
        .eq('store_record_id', recordId);
        
      if (qaDeleteError) {
        console.error('⚠️ Error deleting quality assessments:', qaDeleteError);
      } else {
        console.log('✅ Deleted quality assessments');
      }
      
      // 2. Delete payment records
      const { error: paymentDeleteError } = await supabase
        .from('payment_records')
        .delete()
        .eq('batch_number', coffeeRecord.batchNumber);
        
      if (paymentDeleteError) {
        console.error('⚠️ Error deleting payment records:', paymentDeleteError);
      } else {
        console.log('✅ Deleted payment records');
      }
      
      // 3. Get Supabase coffee_records to delete finance_coffee_lots
      const { data: supabaseCoffeeRecords } = await supabase
        .from('coffee_records')
        .select('id')
        .eq('batch_number', coffeeRecord.batchNumber);
      
      if (supabaseCoffeeRecords && supabaseCoffeeRecords.length > 0) {
        const supabaseRecordIds = supabaseCoffeeRecords.map(r => r.id);
        
        // 4. Delete finance_coffee_lots
        const { error: financeDeleteError } = await supabase
          .from('finance_coffee_lots')
          .delete()
          .in('coffee_record_id', supabaseRecordIds);
          
        if (financeDeleteError) {
          console.error('⚠️ Error deleting finance lots:', financeDeleteError);
        } else {
          console.log('✅ Deleted finance lots');
        }
        
        // 5. Delete coffee_records from Supabase
        const { error: coffeeDeleteError } = await supabase
          .from('coffee_records')
          .delete()
          .in('id', supabaseRecordIds);
          
        if (coffeeDeleteError) {
          console.error('⚠️ Error deleting coffee records from Supabase:', coffeeDeleteError);
        } else {
          console.log('✅ Deleted coffee records from Supabase');
        }
      }

      console.log('🔄 Refreshing data...');
      await fetchStoreData();
      
      toast({
        title: "✅ Deleted Successfully",
        description: `Coffee record deleted: ${coffeeRecord.supplierName} - ${coffeeRecord.kilograms}kg (${coffeeRecord.batchNumber})`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('❌ Error deleting coffee record:', error);
      toast({
        title: "❌ Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting the record",
        variant: "destructive",
        duration: 5000
      });
      throw error;
    }
  };

  const addCoffeeRecord = async (recordData: Omit<StoreRecord, 'id'>) => {
    try {
      console.log('Adding coffee record to Firebase:', recordData);
      
      // Find supplier to get supplier ID
      const supplier = suppliers.find(s => s.name === recordData.supplierName);
      const contract = supplier ? getActiveContractForSupplier(supplier.id) : null;
      
      const coffeeDoc = {
        supplier_name: recordData.supplierName,
        coffee_type: recordData.coffeeType,
        bags: recordData.bags,
        kilograms: recordData.kilograms,
        date: recordData.date,
        batch_number: recordData.batchNumber,
        status: recordData.status,
        supplier_id: supplier?.id || null,
        contract_info: contract ? {
          contractId: contract.id,
          contractPrice: contract.pricePerKg,
          contractType: contract.contractType
        } : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'coffee_records'), coffeeDoc);
      console.log('✅ Coffee record added to Firebase with ID:', docRef.id);

      // Immediately add to Supabase tables for parallel workflow
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('📤 Attempting to save to Supabase coffee_records...');
      // Insert into coffee_records (don't set ID, let Supabase generate it)
      const { data: supabaseCoffeeRecord, error: coffeeError } = await supabase
        .from('coffee_records')
        .insert({
          supplier_name: recordData.supplierName,
          coffee_type: recordData.coffeeType,
          bags: recordData.bags,
          kilograms: recordData.kilograms,
          date: recordData.date,
          batch_number: recordData.batchNumber,
          status: recordData.status,
          supplier_id: supplier?.id || null
        })
        .select()
        .single();

      if (coffeeError) {
        console.error('❌ Error adding to Supabase coffee_records:', coffeeError);
      } else {
        console.log('✅ Added to Supabase coffee_records:', supabaseCoffeeRecord);
        
        // Only add to finance if coffee_records was successful
        console.log('📤 Attempting to save to finance_coffee_lots...');
        const unitPrice = contract?.pricePerKg || 7000;
        const { error: financeError } = await supabase
          .from('finance_coffee_lots')
          .insert({
            coffee_record_id: supabaseCoffeeRecord.id,
            supplier_id: supplier?.id || null,
            assessed_by: 'Store Department',
            quality_json: {
              batch_number: recordData.batchNumber,
              coffee_type: recordData.coffeeType,
              supplier_name: recordData.supplierName,
              status: 'pending_assessment',
              note: 'Awaiting quality assessment - available for finance processing'
            },
            unit_price_ugx: unitPrice,
            quantity_kg: recordData.kilograms,
            finance_status: 'READY_FOR_FINANCE'
          });

        if (financeError) {
          console.error('❌ Error adding to finance_coffee_lots:', financeError);
        } else {
          console.log('✅ Successfully added to finance_coffee_lots - ready for Finance department!');
        }
      }
      
      await fetchStoreData();
      
      // Notify BOTH Quality AND Finance departments
      await createAnnouncement(
        'New Coffee Record for Quality Assessment',
        `New coffee received: ${recordData.kilograms}kg from ${recordData.supplierName}. Batch: ${recordData.batchNumber}. Requires quality assessment.`,
        'Store',
        ['Quality'],
        'Medium'
      );

      await createAnnouncement(
        'New Coffee Available for Payment',
        `New coffee delivery: ${recordData.kilograms}kg from ${recordData.supplierName}. Batch: ${recordData.batchNumber}. Available for finance processing.`,
        'Store',
        ['Finance'],
        'Medium'
      );
      
      const contractMessage = contract ? 
        ` (Contract: ${contract.contractType} @ ${contract.pricePerKg}/kg)` : 
        ' (No active contract)';
      
      toast({
        title: "Success",
        description: `Coffee record added successfully${contractMessage}. Sent to Quality & Finance.`
      });
    } catch (error) {
      console.error('Error adding coffee record:', error);
      toast({
        title: "Error",
        description: "Failed to add coffee record to database",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateCoffeeRecordStatus = async (recordId: string, status: string) => {
    try {
      console.log('Updating coffee record status in Firebase:', recordId, status);
      
      const record = storeRecords.find(r => r.id === recordId);
      
      const docRef = doc(db, 'coffee_records', recordId);
      await updateDoc(docRef, {
        status,
        updated_at: new Date().toISOString()
      });

      // Departmental notifications based on status changes
      if (record) {
        if (status === 'quality_review') {
          await createAnnouncement(
            'Pending Quality Assessment',
            `Batch ${record.batchNumber} from Store is awaiting quality assessment. Supplier: ${record.supplierName}.`,
            'Store',
            ['Quality'],
            'High'
          );
        }
        if (status === 'assessed') {
          await createAnnouncement(
            'Assessment Completed',
            `Batch ${record.batchNumber} has been assessed. Pending finance processing.`,
            'Quality',
            ['Finance'],
            'Medium'
          );
        }
      }

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
    fetchSuppliers();
    
    // Auto-refresh every 10 seconds to catch status updates (silent background refresh)
    const refreshInterval = setInterval(() => {
      fetchStoreData(true); // Pass true for silent refresh
    }, 10000);
    
    return () => clearInterval(refreshInterval);
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
