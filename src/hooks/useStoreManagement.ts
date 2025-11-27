import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';
import { useNotifications } from '@/hooks/useNotifications';
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
      console.log('Fetching store records from Supabase...');
      
      const { data: supabaseRecords, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching coffee records:', error);
        setStoreRecords([]);
        return;
      }

      console.log('Supabase records:', supabaseRecords?.length || 0);
      
      const transformedRecords: StoreRecord[] = (supabaseRecords || []).map(record => ({
        id: record.id,
        supplierName: record.supplier_name || '',
        coffeeType: record.coffee_type || '',
        bags: Number(record.bags) || 0,
        kilograms: Number(record.kilograms) || 0,
        date: record.date || '',
        batchNumber: record.batch_number || '',
        status: record.status || 'pending'
      }));
      
      // Get quality assessments status
      const { data: qualityAssessments } = await supabase
        .from('quality_assessments')
        .select('batch_number, status')
        .in('batch_number', transformedRecords.map(r => r.batchNumber).filter(Boolean));
      
      // Get payment records status
      const { data: paymentRecords } = await supabase
        .from('payment_records')
        .select('batch_number, status')
        .in('batch_number', transformedRecords.map(r => r.batchNumber).filter(Boolean));
      
      // Create lookup maps
      const qualityStatusMap = new Map(qualityAssessments?.map(qa => [qa.batch_number, qa.status]));
      const paymentStatusMap = new Map(paymentRecords?.map(pr => [pr.batch_number, pr.status]));
      
      // Determine the most accurate status for each record
      const finalRecords = transformedRecords.map(record => {
        let finalStatus = record.status;
        
        // Priority order: rejected > paid > submitted_to_finance > assessed > current
        const qualityStatus = qualityStatusMap.get(record.batchNumber);
        const paymentStatus = paymentStatusMap.get(record.batchNumber);
        
        if (record.status === 'rejected' || qualityStatus === 'rejected') {
          finalStatus = 'rejected';
        } else if (paymentStatus === 'Paid' || paymentStatus === 'paid' || paymentStatus === 'completed') {
          finalStatus = 'paid';
        } else if (qualityStatus === 'submitted_to_finance') {
          finalStatus = 'submitted_to_finance';
        } else if (qualityStatus === 'assessed') {
          finalStatus = 'assessed';
        }
        
        return {
          ...record,
          status: finalStatus
        };
      });

      console.log('✅ Loaded records with updated statuses:', finalRecords.map(r => ({ batch: r.batchNumber, status: r.status })));
      setStoreRecords(finalRecords);
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
      console.log('Fetching suppliers from Supabase...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
        return;
      }

      const transformedSuppliers: Supplier[] = (data || []).map(supplier => ({
        id: supplier.id,
        name: supplier.name || '',
        origin: supplier.origin || '',
        phone: supplier.phone || '',
        code: supplier.code || '',
        opening_balance: Number(supplier.opening_balance) || 0,
        date_registered: supplier.date_registered || ''
      }));

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
      console.log('Adding supplier to Supabase:', supplierData);
      
      const { error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          origin: supplierData.location,
          phone: supplierData.phone || null,
          code: `SUP${Date.now()}`,
          opening_balance: 0,
          date_registered: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;
      
      console.log('Supplier added successfully');
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
      
      // Refresh suppliers list
      await fetchSuppliers();
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
      console.log('🔄 Updating coffee record:', recordId, recordData);
      
      const { error: updateError } = await supabase
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
        .eq('id', recordId);
      
      if (updateError) {
        console.error('Error updating coffee record:', updateError);
        throw updateError;
      }
      
      // Update related quality assessments
      if (recordData.batchNumber) {
        await supabase
          .from('quality_assessments')
          .update({
            batch_number: recordData.batchNumber,
            kilograms: recordData.kilograms
          })
          .eq('store_record_id', recordId);
      }
      
      // Update finance_coffee_lots
      await supabase
        .from('finance_coffee_lots')
        .update({
          quantity_kg: recordData.kilograms
        })
        .eq('coffee_record_id', recordId);

      await fetchStoreData();
      
      console.log('✅ Successfully updated record');
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
      console.log('🗑️ Starting deletion process for record:', recordId);
      
      // Get the coffee record
      const coffeeRecord = storeRecords.find(record => record.id === recordId);
      if (!coffeeRecord) {
        toast({
          title: "Error",
          description: "Coffee record not found",
          variant: "destructive"
        });
        return;
      }

      console.log('📋 Found record:', {
        batch: coffeeRecord.batchNumber,
        supplier: coffeeRecord.supplierName,
        kg: coffeeRecord.kilograms
      });

      // Check payment status
      console.log('🔍 Checking payment records...');
      const { data: payments } = await supabase
        .from('payment_records')
        .select('*')
        .eq('batch_number', coffeeRecord.batchNumber)
        .in('status', ['Paid', 'paid', 'Processing', 'Approved', 'completed', 'Completed']);

      if (payments && payments.length > 0) {
        toast({
          title: "❌ Cannot Delete",
          description: `Payment has been processed for this batch (${coffeeRecord.batchNumber}). Contact Finance to reverse the payment first.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      // Check quality assessments
      console.log('🔍 Checking quality assessments...');
      const { data: qualityAssessments } = await supabase
        .from('quality_assessments')
        .select('*')
        .eq('store_record_id', recordId)
        .in('status', ['submitted_to_finance', 'paid']);

      if (qualityAssessments && qualityAssessments.length > 0) {
        toast({
          title: "❌ Cannot Delete",
          description: `Quality assessment has been submitted to Finance for batch ${coffeeRecord.batchNumber}. Please contact Quality department.`,
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      console.log('✅ All checks passed, proceeding with deletion...');
      
      // Delete in cascade order
      console.log('🗄️ Deleting from Supabase...');
      
      // 1. Delete finance_coffee_lots
      await supabase
        .from('finance_coffee_lots')
        .delete()
        .eq('coffee_record_id', recordId);
      
      // 2. Delete quality assessments
      await supabase
        .from('quality_assessments')
        .delete()
        .eq('store_record_id', recordId);
      
      // 3. Delete payment records
      await supabase
        .from('payment_records')
        .delete()
        .eq('batch_number', coffeeRecord.batchNumber);
      
      // 4. Delete coffee record
      const { error: deleteError } = await supabase
        .from('coffee_records')
        .delete()
        .eq('id', recordId);
      
      if (deleteError) {
        throw deleteError;
      }

      console.log('✅ Deleted successfully');
      await fetchStoreData(false);
      
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
      console.log('Adding coffee record to Supabase:', recordData);
      
      // Check for duplicate batch number
      const { data: batchCheck } = await supabase
        .from('coffee_records')
        .select('id, batch_number')
        .eq('batch_number', recordData.batchNumber)
        .limit(1);

      if (batchCheck && batchCheck.length > 0) {
        const error = `Duplicate batch number: ${recordData.batchNumber} already exists`;
        console.error('❌', error);
        toast({
          title: "❌ Duplicate Batch Number",
          description: error,
          variant: "destructive",
          duration: 5000
        });
        throw new Error(error);
      }

      // Check for exact duplicate record (same supplier, weight, date)
      const { data: exactCheck } = await supabase
        .from('coffee_records')
        .select('id, supplier_name, kilograms, date')
        .eq('supplier_name', recordData.supplierName)
        .eq('kilograms', recordData.kilograms)
        .eq('date', recordData.date)
        .limit(1);

      if (exactCheck && exactCheck.length > 0) {
        const error = `Duplicate entry: A record with ${recordData.kilograms}kg from ${recordData.supplierName} on ${recordData.date} already exists`;
        console.error('❌', error);
        toast({
          title: "❌ Duplicate Record",
          description: error,
          variant: "destructive",
          duration: 5000
        });
        throw new Error(error);
      }
      
      // Find supplier to get supplier ID
      const supplier = suppliers.find(s => s.name === recordData.supplierName);
      const contract = supplier ? getActiveContractForSupplier(supplier.id) : null;
      
      // Insert into Supabase coffee_records
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
          supplier_id: supplier?.id || null,
          created_by: 'Store Department'
        })
        .select()
        .single();

      if (coffeeError) {
        console.error('❌ Error adding to Supabase:', coffeeError);
        throw coffeeError;
      }

      console.log('✅ Coffee record added to Supabase:', supabaseCoffeeRecord);
      
      // Add to finance_coffee_lots
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
        console.log('✅ Successfully added to finance_coffee_lots');
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
      console.log('Updating coffee record status in Supabase:', recordId, status);
      
      const record = storeRecords.find(r => r.id === recordId);
      
      const { error } = await supabase
        .from('coffee_records')
        .update({ status })
        .eq('id', recordId);

      if (error) throw error;

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
        if (status === 'quality_review') {
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
      awaitingPricing: storeRecords.filter(r => r.status === 'quality_review').length,
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
