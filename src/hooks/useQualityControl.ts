
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export interface StoreRecord extends Tables<'coffee_records'> {}

export interface QualityAssessment extends Tables<'quality_assessments'> {}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data from Firebase
  useEffect(() => {
    loadStoreRecords();
    loadQualityAssessments();
  }, []);

  const loadStoreRecords = async () => {
    setLoading(true);
    try {
      console.log('Loading store records from Firebase...');
      
      const recordsQuery = query(collection(db, 'coffee_records'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(recordsQuery);

      console.log('Raw Firebase store records count:', querySnapshot.size);
      
      // Transform Firebase data to match StoreRecord interface
      const transformedRecords = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        console.log('Processing store record:', data);
        
        return {
          id: docSnap.id,
          coffee_type: data.coffee_type || '',
          date: data.date || '',
          kilograms: Number(data.kilograms) || 0,
          bags: Number(data.bags) || 0,
          supplier_id: data.supplier_id || null,
          supplier_name: data.supplier_name || '',
          status: data.status || 'pending',
          batch_number: data.batch_number || '',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        };
      });

      console.log('Transformed store records:', transformedRecords);
      setStoreRecords(transformedRecords);
    } catch (error) {
      console.error('Error loading store records:', error);
      setStoreRecords([]);
      toast({
        title: "Error",
        description: "Failed to load store records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadQualityAssessments = async () => {
    try {
      console.log('Loading quality assessments from Firebase...');
      
      const assessmentsQuery = query(collection(db, 'quality_assessments'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(assessmentsQuery);

      console.log('Raw Firebase quality assessments count:', querySnapshot.size);
      
      // Transform Firebase data to match QualityAssessment interface
      const transformedAssessments = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        console.log('Processing quality assessment:', data);
        
        return {
          id: docSnap.id,
          store_record_id: data.store_record_id || null,
          batch_number: data.batch_number || '',
          moisture: Number(data.moisture) || 0,
          group1_defects: Number(data.group1_defects) || 0,
          group2_defects: Number(data.group2_defects) || 0,
          below12: Number(data.below12) || 0,
          pods: Number(data.pods) || 0,
          husks: Number(data.husks) || 0,
          stones: Number(data.stones) || 0,
          suggested_price: Number(data.suggested_price) || 0,
          status: data.status || 'assessed',
          comments: data.comments || null,
          date_assessed: data.date_assessed || new Date().toISOString().split('T')[0],
          assessed_by: data.assessed_by || 'Quality Officer',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString()
        };
      });

      console.log('Transformed quality assessments:', transformedAssessments);
      setQualityAssessments(transformedAssessments);
    } catch (error) {
      console.error('Error loading quality assessments:', error);
      setQualityAssessments([]);
      toast({
        title: "Error",
        description: "Failed to load quality assessments",
        variant: "destructive"
      });
    }
  };

  const addStoreRecord = (record: Omit<StoreRecord, 'id'>) => {
    // This method is kept for compatibility but data should be added through Store Management
    console.log('Store records should be added through Store Management');
  };

  const updateStoreRecord = async (id: string, updates: Partial<StoreRecord>) => {
    try {
      console.log('Updating store record in Firebase:', id, updates);
      
      const docRef = doc(db, 'coffee_records', id);
      await updateDoc(docRef, {
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
      
      // Refresh data to ensure consistency
      await loadStoreRecords();
      
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'quality_assessments'), assessmentToAdd);
      console.log('Quality assessment added successfully with ID:', docRef.id);
      
      // Automatically create a payment record in Finance
      console.log('Creating payment record for assessment:', docRef.id);
      await addDoc(collection(db, 'payment_records'), {
        supplier: assessment.batch_number || 'Unknown Supplier',
        amount: assessment.suggested_price || 0,
        status: 'Pending',
        method: 'Bank Transfer',
        date: new Date().toLocaleDateString(),
        batchNumber: assessment.batch_number,
        qualityAssessmentId: docRef.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log('Payment record created successfully');
      
      // Refresh assessments to get the new one with ID
      await loadQualityAssessments();
      
      toast({
        title: "Success",
        description: "Quality assessment saved and sent to finance for payment processing"
      });
      
      return { id: docRef.id, ...assessmentToAdd };
    } catch (error) {
      console.error('Error adding quality assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save quality assessment to database",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateQualityAssessment = async (id: string, updates: Partial<QualityAssessment>) => {
    try {
      console.log('Updating quality assessment in Firebase:', id, updates);
      
      const docRef = doc(db, 'quality_assessments', id);
      await updateDoc(docRef, {
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
      
      // Refresh data to ensure consistency
      await loadQualityAssessments();
      
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
      
      // Update the assessment status to submitted_to_finance
      await updateQualityAssessment(assessmentId, { 
        status: 'submitted_to_finance' as any 
      });
      
      // Find the assessment to get details for payment record
      const assessment = qualityAssessments.find(a => a.id === assessmentId);
      
      if (assessment) {
        // Check if payment record already exists
        const existingPaymentsQuery = query(
          collection(db, 'payment_records'),
          where('qualityAssessmentId', '==', assessmentId)
        );
        const existingPaymentsSnapshot = await getDocs(existingPaymentsQuery);
        
        if (existingPaymentsSnapshot.empty) {
          // Create payment record
          console.log('Creating payment record for submitted assessment');
          await addDoc(collection(db, 'payment_records'), {
            supplier: assessment.batch_number || 'Unknown Supplier',
            amount: assessment.suggested_price || 0,
            status: 'Pending',
            method: 'Bank Transfer',
            date: new Date().toLocaleDateString(),
            batchNumber: assessment.batch_number,
            qualityAssessmentId: assessmentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          console.log('Payment record created for submitted assessment');
        }
      }
      
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

  return {
    storeRecords,
    qualityAssessments,
    pendingRecords,
    loading,
    addStoreRecord,
    updateStoreRecord,
    addQualityAssessment,
    updateQualityAssessment,
    submitToFinance,
    refreshData: () => {
      loadStoreRecords();
      loadQualityAssessments();
    },
  };
};
