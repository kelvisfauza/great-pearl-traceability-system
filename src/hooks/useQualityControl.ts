
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';

export interface StoreRecord {
  id: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier_name: string;
  coffee_type: string;
  batch_number: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QualityAssessment {
  id: string;
  store_record_id: string;
  batch_number: string;
  moisture: number;
  group1_defects: number;
  group2_defects: number;
  below12: number;
  pods: number;
  husks: number;
  stones: number;
  suggested_price: number;
  status: string;
  comments: string | null;
  date_assessed: string;
  assessed_by: string;
  created_at: string;
  updated_at: string;
}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { getContractPriceForSupplier } = useSupplierContracts();

  const loadStoreRecords = useCallback(async () => {
    try {
      console.log('Loading coffee records from Firebase...');
      
      const coffeeQuery = query(collection(db, 'coffee_records'), orderBy('created_at', 'desc'));
      const coffeeSnapshot = await getDocs(coffeeQuery);
      const coffeeData = coffeeSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreRecord[];

      console.log('Loaded coffee records:', coffeeData.length, 'records');
      setStoreRecords(coffeeData || []);
      return coffeeData;
    } catch (error) {
      console.error('Error loading store records:', error);
      setStoreRecords([]);
      throw error;
    }
  }, []);

  const loadQualityAssessments = useCallback(async () => {
    try {
      console.log('Loading quality assessments from Firebase...');
      
      const qualityQuery = query(collection(db, 'quality_assessments'), orderBy('created_at', 'desc'));
      const qualitySnapshot = await getDocs(qualityQuery);
      const qualityData = qualitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as QualityAssessment[];

      console.log('Loaded quality assessments:', qualityData.length, 'assessments');
      setQualityAssessments(qualityData || []);
      return qualityData;
    } catch (error) {
      console.error('Error loading quality assessments:', error);
      setQualityAssessments([]);
      throw error;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (loading) return; // Prevent multiple concurrent loads
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting data load...');
      await Promise.all([
        loadStoreRecords(),
        loadQualityAssessments()
      ]);
      console.log('Data load completed successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [loadStoreRecords, loadQualityAssessments, loading, toast]);

  // Load data on mount - only once
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    
    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  const updateStoreRecord = async (id: string, updates: Partial<StoreRecord>) => {
    try {
      console.log('Updating store record in Firebase:', id, updates);
      
      await updateDoc(doc(db, 'coffee_records', id), {
        ...updates,
        updated_at: new Date().toISOString()
      });

      console.log('Store record updated successfully');
      
      // Update local state
      setStoreRecords(records => 
        records.map(record => 
          record.id === id ? { ...record, ...updates } : record
        )
      );
      
      toast({
        title: "Success",
        description: "Store record updated successfully"
      });
    } catch (error) {
      console.error('Error updating store record:', error);
      toast({
        title: "Error",
        description: "Failed to update store record",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addQualityAssessment = async (assessment: Omit<QualityAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding quality assessment to Firebase:', assessment);
      
      // Find the coffee record to get supplier info
      const coffeeRecord = storeRecords.find(record => record.id === assessment.store_record_id);
      if (!coffeeRecord) {
        throw new Error('Coffee record not found');
      }

      // Get supplier from suppliers collection to get the supplier ID
      const suppliersQuery = query(
        collection(db, 'suppliers'),
        where('name', '==', coffeeRecord.supplier_name)
      );
      const suppliersSnapshot = await getDocs(suppliersQuery);
      
      let contractPrice: number | null = null;
      if (!suppliersSnapshot.empty) {
        const supplierDoc = suppliersSnapshot.docs[0];
        const supplierId = supplierDoc.id;
        contractPrice = getContractPriceForSupplier(supplierId);
      }

      // Validate price against contract if contract exists
      if (contractPrice && assessment.suggested_price > contractPrice) {
        toast({
          title: "Price Validation Error",
          description: `Suggested price (${assessment.suggested_price}) exceeds contract price (${contractPrice}). Please adjust.`,
          variant: "destructive"
        });
        throw new Error('Price exceeds contract limit');
      }

      const assessmentToAdd = {
        store_record_id: assessment.store_record_id,
        batch_number: assessment.batch_number,
        moisture: assessment.moisture,
        group1_defects: assessment.group1_defects || 0,
        group2_defects: assessment.group2_defects || 0,
        below12: assessment.below12 || 0,
        pods: assessment.pods || 0,
        husks: assessment.husks || 0,
        stones: assessment.stones || 0,
        suggested_price: assessment.suggested_price,
        status: 'assessed',
        comments: assessment.comments || null,
        date_assessed: assessment.date_assessed,
        assessed_by: assessment.assessed_by,
        contract_price: contractPrice,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'quality_assessments'), assessmentToAdd);
      console.log('Quality assessment added successfully:', docRef.id);
      
      // Calculate total payment amount: kilograms × price per kg
      const kilograms = coffeeRecord?.kilograms || 0;
      const totalPaymentAmount = kilograms * assessment.suggested_price;
      
      console.log('Payment calculation:', {
        kilograms,
        pricePerKg: assessment.suggested_price,
        totalAmount: totalPaymentAmount,
        contractPrice: contractPrice || 'No contract'
      });
      
      // Create payment record in Firebase with calculated amount
      console.log('Creating payment record for assessment:', docRef.id);
      
      await addDoc(collection(db, 'payment_records'), {
        supplier: coffeeRecord.supplier_name,
        amount: totalPaymentAmount,
        status: 'Pending',
        method: 'Bank Transfer',
        date: new Date().toISOString().split('T')[0],
        batchNumber: assessment.batch_number,
        qualityAssessmentId: docRef.id,
        contractPrice: contractPrice,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log('Payment record created successfully with amount:', totalPaymentAmount);
      
      // Update local state
      const newAssessment = { id: docRef.id, ...assessmentToAdd };
      setQualityAssessments(prev => [newAssessment, ...prev]);
      
      const contractMessage = contractPrice ? 
        ` (Contract price: ${contractPrice}/kg)` : 
        ' (No active contract)';
      
      toast({
        title: "Success",
        description: `Quality assessment saved and payment record created for ${totalPaymentAmount.toLocaleString()} UGX${contractMessage}`
      });
      
      return newAssessment;
    } catch (error) {
      console.error('Error adding quality assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save quality assessment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateQualityAssessment = async (id: string, updates: Partial<QualityAssessment>) => {
    try {
      console.log('Updating quality assessment in Firebase:', id, updates);
      
      await updateDoc(doc(db, 'quality_assessments', id), {
        ...updates,
        updated_at: new Date().toISOString()
      });

      console.log('Quality assessment updated successfully');
      
      // Update local state
      setQualityAssessments(assessments => 
        assessments.map(assessment => 
          assessment.id === id ? { ...assessment, ...updates } : assessment
        )
      );
      
      toast({
        title: "Success",
        description: "Quality assessment updated successfully"
      });
    } catch (error) {
      console.error('Error updating quality assessment:', error);
      toast({
        title: "Error",
        description: "Failed to update quality assessment",
        variant: "destructive"
      });
      throw error;
    }
  };

  const submitToFinance = async (assessmentId: string) => {
    try {
      console.log('Submitting assessment to finance:', assessmentId);
      
      await updateQualityAssessment(assessmentId, { 
        status: 'submitted_to_finance'
      });
      
      console.log('Assessment submitted to finance successfully');
      
      toast({
        title: "Submitted to Finance",
        description: "Assessment has been sent to finance department for payment processing"
      });
    } catch (error) {
      console.error('Error submitting to finance:', error);
      toast({
        title: "Error",
        description: "Failed to submit to finance",
        variant: "destructive"
      });
    }
  };

  const pendingRecords = storeRecords.filter(record => 
    record.status === 'pending' || record.status === 'quality_review'
  );

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    storeRecords,
    qualityAssessments,
    pendingRecords,
    loading,
    error,
    updateStoreRecord,
    addQualityAssessment,
    updateQualityAssessment,
    submitToFinance,
    refreshData,
  };
};
