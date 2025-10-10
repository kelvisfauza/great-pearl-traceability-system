
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, addDoc, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierContracts } from './useSupplierContracts';
import { useNotifications } from '@/hooks/useNotifications';
import { useGlobalErrorHandler } from '@/hooks/useGlobalErrorHandler';

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
  supplier_name?: string;
  coffee_type?: string;
  kilograms?: number;
}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { getContractPriceForSupplier } = useSupplierContracts();
  const { createAnnouncement, createPricingNotification } = useNotifications();
  const { reportDatabaseError, reportWorkflowError } = useGlobalErrorHandler();

  const loadStoreRecords = useCallback(async () => {
    try {
      console.log('Loading coffee records from Firebase...');
      
      const coffeeQuery = query(collection(db, 'coffee_records'), orderBy('created_at', 'desc'));
      const coffeeSnapshot = await getDocs(coffeeQuery);
      const coffeeData = coffeeSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StoreRecord))
        .filter(record => record.status !== 'paid'); // Filter out paid records

      console.log('Loaded coffee records (excluding paid):', coffeeData.length, 'records');
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
      
      // Fetch from Supabase - get quality assessments first, then join data manually
      const { data: supabaseQualityData, error: qualityError } = await supabase
        .from('quality_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (qualityError) {
        console.error('Error fetching quality assessments from Supabase:', qualityError);
      }

      // If we have quality assessments, fetch corresponding coffee records
      let enrichedSupabaseData = [];
      if (supabaseQualityData && supabaseQualityData.length > 0) {
        const storeRecordIds = [...new Set(supabaseQualityData.map(qa => qa.store_record_id).filter(Boolean))];
        
        if (storeRecordIds.length > 0) {
          const { data: coffeeRecords } = await supabase
            .from('coffee_records')
            .select('*')
            .in('id', storeRecordIds);

          // Manually join the data
          enrichedSupabaseData = supabaseQualityData.map(assessment => {
            const coffeeRecord = coffeeRecords?.find(record => record.id === assessment.store_record_id);
            return {
              ...assessment,
              supplier_name: coffeeRecord?.supplier_name || 'Unknown',
              coffee_type: coffeeRecord?.coffee_type || 'Unknown',
              kilograms: coffeeRecord?.kilograms || 0,
              batch_number: coffeeRecord?.batch_number || assessment.batch_number,
              source: 'supabase'
            };
          });
        } else {
          enrichedSupabaseData = supabaseQualityData.map(assessment => ({
            ...assessment,
            supplier_name: 'Unknown',
            coffee_type: 'Unknown',
            kilograms: 0,
            batch_number: assessment.batch_number,
            source: 'supabase'
          }));
        }
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

      // Transform the enriched Supabase data (no need to flatten since we manually joined)
      const transformedSupabaseData = enrichedSupabaseData;

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
    if (loading) {
      console.log('Assessment save already in progress, skipping...');
      return;
    }
    
    try {
      console.log('=== STARTING QUALITY ASSESSMENT SAVE ===');
      console.log('Assessment data received:', JSON.stringify(assessment, null, 2));
      
      // Find the coffee record to get supplier info
      const coffeeRecord = storeRecords.find(record => record.id === assessment.store_record_id);
      console.log('Found coffee record:', coffeeRecord);
      
      if (!coffeeRecord) {
        const error = new Error(`Coffee record not found for ID: ${assessment.store_record_id}`);
        console.error(error.message);
        throw error;
      }

      // First, ensure the coffee record exists in Supabase
      console.log('Checking if coffee record exists in Supabase...');
      const { data: existingCoffeeRecord, error: checkError } = await supabase
        .from('coffee_records')
        .select('id')
        .eq('id', assessment.store_record_id)
        .maybeSingle();

      let coffeeRecordId = assessment.store_record_id;

      // If coffee record doesn't exist in Supabase, create it
      if (!existingCoffeeRecord && !checkError) {
        console.log('Coffee record not found in Supabase, creating it...');
        const coffeeRecordData = {
          id: coffeeRecord.id,
          date: coffeeRecord.date,
          kilograms: Number(coffeeRecord.kilograms) || 0,
          bags: Number(coffeeRecord.bags) || 0,
          supplier_name: coffeeRecord.supplier_name || 'Unknown',
          coffee_type: coffeeRecord.coffee_type || 'Unknown',
          batch_number: coffeeRecord.batch_number || '',
          status: coffeeRecord.status || 'pending'
        };
        
        console.log('Creating coffee record with data:', coffeeRecordData);
        
        const { data: newCoffeeRecord, error: createError } = await supabase
          .from('coffee_records')
          .insert([coffeeRecordData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating coffee record in Supabase:', createError);
          throw new Error(`Failed to create coffee record: ${createError.message}`);
        }
        
        coffeeRecordId = newCoffeeRecord.id;
        console.log('Coffee record created in Supabase successfully:', newCoffeeRecord);
      } else if (checkError) {
        console.error('Error checking coffee record:', checkError);
        throw new Error(`Failed to check coffee record: ${checkError.message}`);
      } else {
        console.log('Coffee record already exists in Supabase');
      }

      // Prepare assessment data with proper validation
      // Use suggested_price which contains the final price (calculator or manual)
      const finalPrice = Number(assessment.suggested_price) || 0;
      
      if (finalPrice <= 0) {
        throw new Error('Invalid price: Price must be greater than 0');
      }
      
      // Use the existing batch number or generate a new one if missing
      let batchNumber = assessment.batch_number || coffeeRecord.batch_number;
      if (!batchNumber) {
        // Import the batch utils for consistency
        const { generateBatchNumber } = await import('@/utils/batchUtils');
        batchNumber = await generateBatchNumber();
      }
        
      const assessmentData = {
        store_record_id: coffeeRecordId,
        batch_number: batchNumber,
        moisture: Number(assessment.moisture) || 0,
        group1_defects: Number(assessment.group1_defects) || 0,
        group2_defects: Number(assessment.group2_defects) || 0,
        below12: Number(assessment.below12) || 0,
        pods: Number(assessment.pods) || 0,
        husks: Number(assessment.husks) || 0,
        stones: Number(assessment.stones) || 0,
        suggested_price: finalPrice, // This is the price that finance will see
        status: 'assessed',
        comments: assessment.comments || null,
        date_assessed: assessment.date_assessed || new Date().toISOString().split('T')[0],
        assessed_by: assessment.assessed_by // This should now contain the actual user's name from the form
      };
      
      console.log('Prepared assessment data:', JSON.stringify(assessmentData, null, 2));

      // Create assessment record in Supabase
      console.log('Inserting quality assessment into Supabase...');
      const { data: newAssessment, error: insertError } = await supabase
        .from('quality_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting quality assessment:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        console.error('Assessment data that failed:', JSON.stringify(assessmentData, null, 2));
        
        // Show detailed error message to user
        let errorMessage = `Failed to save quality assessment: ${insertError.message}`;
        if (insertError.details) {
          errorMessage += ` Details: ${insertError.details}`;
        }
        if (insertError.hint) {
          errorMessage += ` Hint: ${insertError.hint}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Quality assessment saved successfully:', newAssessment);
      
      // Update coffee_records status to 'assessed' in Supabase
      console.log('Updating coffee record status to assessed in Supabase...');
      const { error: supabaseStatusError } = await supabase
        .from('coffee_records')
        .update({ 
          status: 'assessed',
          updated_at: new Date().toISOString()
        })
        .eq('id', coffeeRecordId);

      if (supabaseStatusError) {
        console.error('Error updating coffee record status in Supabase:', supabaseStatusError);
      } else {
        console.log('✅ Coffee record status updated to "assessed" in Supabase');
      }

      // Update coffee_records status to 'assessed' in Firebase as well
      try {
        const coffeeDocRef = doc(db, 'coffee_records', assessment.store_record_id);
        await updateDoc(coffeeDocRef, {
          status: 'assessed',
          updated_at: new Date().toISOString()
        });
        console.log('✅ Coffee record status updated to "assessed" in Firebase');
      } catch (firebaseError) {
        console.error('Error updating coffee record status in Firebase:', firebaseError);
        // Don't throw - this is a sync issue but not critical
      }
      
      // Calculate total payment amount: kilograms × price per kg
      const kilograms = coffeeRecord?.kilograms || 0;
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
          batch_number: batchNumber,
          quality_assessment_id: newAssessment.id
        }]);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        throw paymentError;
      }
      
      // Refresh both quality assessments AND store records to update the pending list
      await Promise.all([
        loadQualityAssessments(),
        loadStoreRecords()
      ]);
      
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
      console.log('=== STARTING QUALITY ASSESSMENT UPDATE ===');
      console.log('Assessment ID:', id);
      console.log('Updates:', JSON.stringify(updates, null, 2));
      
      // Update in Supabase first
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('quality_assessments')
        .update({
          moisture: updates.moisture,
          group1_defects: updates.group1_defects,
          group2_defects: updates.group2_defects,
          below12: updates.below12,
          pods: updates.pods,
          husks: updates.husks,
          stones: updates.stones,
          suggested_price: updates.suggested_price,
          comments: updates.comments,
          status: updates.status || 'assessed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating quality assessment in Supabase:', updateError);
        throw new Error(`Failed to update quality assessment: ${updateError.message}`);
      }

      console.log('Quality assessment updated in Supabase successfully:', updatedAssessment);

      // Update associated payment record if price changed
      if (updates.suggested_price) {
        const { data: existingPayment, error: paymentFetchError } = await supabase
          .from('payment_records')
          .select('*')
          .eq('quality_assessment_id', id)
          .maybeSingle();

        if (existingPayment && !paymentFetchError) {
          // Get coffee record to calculate new total amount
          const { data: coffeeRecord } = await supabase
            .from('coffee_records')
            .select('kilograms')
            .eq('id', updatedAssessment.store_record_id)
            .single();

          if (coffeeRecord) {
            const newTotalAmount = coffeeRecord.kilograms * updates.suggested_price;
            
            const { error: paymentUpdateError } = await supabase
              .from('payment_records')
              .update({
                amount: newTotalAmount,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPayment.id);

            if (paymentUpdateError) {
              console.error('Error updating payment record:', paymentUpdateError);
            } else {
              console.log('Payment record updated with new amount:', newTotalAmount);
            }
          }
        }
      }

      // Update Firebase for backward compatibility
      try {
        await updateDoc(doc(db, 'quality_assessments', id), {
          ...updates,
          updated_at: new Date().toISOString()
        });
        console.log('Quality assessment updated in Firebase successfully');
      } catch (firebaseError) {
        console.warn('Firebase update failed (non-critical):', firebaseError);
      }

      // Refresh both quality assessments AND store records to update the pending list
      await Promise.all([
        loadQualityAssessments(),
        loadStoreRecords()
      ]);
      
      toast({
        title: "Success",
        description: "Quality assessment and payment record updated successfully"
      });

      return updatedAssessment;
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
      
      // Update assessment status in Supabase
      const { error: updateError } = await supabase
        .from('quality_assessments')
        .update({ 
          status: 'submitted_to_finance',
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (updateError) {
        console.error('Error updating assessment status:', updateError);
        // Report database error to IT
        reportDatabaseError(updateError, 'Update Quality Assessment Status', 'quality_assessments');
        throw updateError;
      }
      
      // Update local state
      setQualityAssessments(assessments => 
        assessments.map(assessment => 
          assessment.id === assessmentId ? { ...assessment, status: 'submitted_to_finance' } : assessment
        )
      );
      
      // Notify Finance submission
      try {
        await createAnnouncement(
          'Assessment Submitted to Finance',
          `Quality assessment ${assessmentId} has been submitted to Finance for payment processing`,
          'Quality',
          ['Finance'],
          'Medium'
        );
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Report workflow error to IT
        reportWorkflowError(notificationError, 'Create Finance Notification');
      }
      
      console.log('Assessment submitted to finance successfully');
      
      toast({
        title: "Submitted to Finance",
        description: "Assessment has been sent to finance department for payment processing"
      });
    } catch (error) {
      console.error('Error submitting to finance:', error);
      // Report the overall workflow error to IT
      reportWorkflowError(error, 'Submit Assessment to Finance');
      
      toast({
        title: "Error",
        description: "Failed to submit to finance. IT has been notified of the issue.",
        variant: "destructive"
      });
      throw error; // Re-throw to ensure calling code knows about the error
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
