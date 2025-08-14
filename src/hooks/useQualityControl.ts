
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';
import { useNotifications } from '@/hooks/useNotifications';

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
  const { createAnnouncement, createPricingNotification } = useNotifications();

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
      console.log('Loading quality assessments from both Supabase and Firebase...');
      
      // Fetch from Supabase with joined coffee records data
      const { data: supabaseQualityData, error: qualityError } = await supabase
        .from('quality_assessments')
        .select(`
          *,
          coffee_records!store_record_id (
            supplier_name,
            coffee_type,
            kilograms,
            batch_number
          )
        `)
        .order('created_at', { ascending: false });

      if (qualityError) {
        console.error('Error fetching quality assessments from Supabase:', qualityError);
      }

      // Fetch from Firebase
      let firebaseQualityData = [];
      try {
        const firebaseQuery = query(collection(db, 'quality_assessments'), orderBy('created_at', 'desc'));
        const firebaseSnapshot = await getDocs(firebaseQuery);
        firebaseQualityData = firebaseSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'firebase'
        }));
        console.log('Loaded quality assessments from Firebase:', firebaseQualityData.length, 'assessments');
      } catch (firebaseError) {
        console.error('Error fetching quality assessments from Firebase:', firebaseError);
      }

      // Transform Supabase data to flatten the joined fields
      const transformedSupabaseData = (supabaseQualityData || []).map(assessment => ({
        ...assessment,
        supplier_name: assessment.coffee_records?.supplier_name || 'Unknown',
        coffee_type: assessment.coffee_records?.coffee_type || 'Unknown',
        kilograms: assessment.coffee_records?.kilograms || 0,
        batch_number: assessment.coffee_records?.batch_number || assessment.batch_number,
        source: 'supabase'
      }));

      // Combine data from both sources, removing duplicates by batch_number
      const batchMap = new Map();
      
      // Add Supabase data first (priority)
      transformedSupabaseData.forEach(assessment => {
        if (assessment.batch_number) {
          batchMap.set(assessment.batch_number, assessment);
        }
      });
      
      // Add Firebase data only if batch_number doesn't exist
      firebaseQualityData.forEach(assessment => {
        if (assessment.batch_number && !batchMap.has(assessment.batch_number)) {
          batchMap.set(assessment.batch_number, assessment);
        }
      });

      const combinedData = Array.from(batchMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('Combined quality assessments:', {
        supabase: transformedSupabaseData.length,
        firebase: firebaseQualityData.length,
        total: combinedData.length
      });
      
      setQualityAssessments(combinedData);
      return combinedData;
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

  const addQualityAssessment = async (assessment: any) => {
    try {
      console.log('Adding quality assessment to Supabase:', assessment);
      
      // Find the coffee record to get supplier info
      const coffeeRecord = storeRecords.find(record => record.id === assessment.store_record_id);
      if (!coffeeRecord) {
        throw new Error('Coffee record not found');
      }

      // Create assessment record in Supabase
      const { data: newAssessment, error: insertError } = await supabase
        .from('quality_assessments')
        .insert([{
          store_record_id: assessment.store_record_id,
          batch_number: assessment.batch_number,
          moisture: assessment.moisture || 0,
          group1_defects: assessment.group1_defects || 0,
          group2_defects: assessment.group2_defects || 0,
          below12: assessment.below12 || 0,
          pods: assessment.pods || 0,
          husks: assessment.husks || 0,
          stones: assessment.stones || 0,
          discretion: assessment.discretion || 0,
          ref_price: assessment.ref_price || 0,
          fm: assessment.fm || 0,
          actual_ott: assessment.actual_ott || 0,
          clean_d14: assessment.clean_d14 || 0,
          outturn: assessment.outturn || 0,
          outturn_price: assessment.outturn_price || 0,
          final_price: assessment.final_price || 0,
          quality_note: assessment.quality_note || '',
          reject_outturn_price: assessment.reject_outturn_price || false,
          reject_final: assessment.reject_final || false,
          suggested_price: assessment.manual_price ? parseFloat(assessment.manual_price) : assessment.final_price || 0,
          status: 'assessed',
          comments: assessment.comments || null,
          date_assessed: assessment.date_assessed || new Date().toISOString().split('T')[0],
          assessed_by: assessment.assessed_by || 'Quality Controller'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting quality assessment:', insertError);
        throw insertError;
      }

      console.log('Quality assessment added to Supabase successfully:', newAssessment);
      
      // Calculate total payment amount: kilograms × price per kg
      const kilograms = coffeeRecord?.kilograms || 0;
      const finalPrice = assessment.manual_price ? parseFloat(assessment.manual_price) : assessment.final_price || 0;
      const totalPaymentAmount = kilograms * finalPrice;
      
      console.log('Payment calculation:', {
        kilograms,
        pricePerKg: finalPrice,
        totalAmount: totalPaymentAmount
      });
      
      // Create payment record in Supabase
      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert([{
          supplier: coffeeRecord.supplier_name,
          amount: totalPaymentAmount,
          status: 'Pending',
          method: 'Bank Transfer',
          date: new Date().toISOString().split('T')[0],
          batch_number: assessment.batch_number,
          quality_assessment_id: newAssessment.id
        }]);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        throw paymentError;
      }
      
      // Refresh quality assessments to get the updated data with joins
      await loadQualityAssessments();
      
      toast({
        title: "Success",
        description: `Quality assessment saved and payment record created for UGX ${totalPaymentAmount.toLocaleString()}`
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
      
      // Notify Finance submission
      await createAnnouncement(
        'Assessment Submitted to Finance',
        `Quality assessment ${assessmentId} has been submitted to Finance for payment processing`,
        'Quality',
        ['Finance'],
        'Medium'
      );
      
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
