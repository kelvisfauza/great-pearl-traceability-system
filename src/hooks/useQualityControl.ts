
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export interface StoreRecord extends Tables<'coffee_records'> {}

export interface QualityAssessment extends Tables<'quality_assessments'> {}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data from Supabase
  useEffect(() => {
    loadStoreRecords();
    loadQualityAssessments();
  }, []);

  const loadStoreRecords = async () => {
    setLoading(true);
    try {
      console.log('Loading store records from Supabase...');
      
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading store records:', error);
        setStoreRecords([]);
        toast({
          title: "Error",
          description: "Failed to load store records",
          variant: "destructive"
        });
        return;
      }

      console.log('Loaded store records:', data);
      setStoreRecords(data || []);
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
      console.log('Loading quality assessments from Supabase...');
      
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading quality assessments:', error);
        setQualityAssessments([]);
        toast({
          title: "Error",
          description: "Failed to load quality assessments",
          variant: "destructive"
        });
        return;
      }

      console.log('Loaded quality assessments:', data);
      setQualityAssessments(data || []);
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
      console.log('Updating store record in Supabase:', id, updates);
      
      const { error } = await supabase
        .from('coffee_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating store record:', error);
        toast({
          title: "Error",
          description: "Failed to update store record",
          variant: "destructive"
        });
        throw error;
      }

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
      console.log('Adding quality assessment to Supabase:', assessment);
      
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
      };

      const { data, error } = await supabase
        .from('quality_assessments')
        .insert(assessmentToAdd)
        .select()
        .single();

      if (error) {
        console.error('Error adding quality assessment:', error);
        toast({
          title: "Error",
          description: "Failed to save quality assessment to database",
          variant: "destructive"
        });
        throw error;
      }

      console.log('Quality assessment added successfully:', data);
      
      // Automatically create a payment record in Finance
      console.log('Creating payment record for assessment:', data.id);
      const { error: paymentError } = await supabase
        .from('payment_records')
        .insert({
          supplier: assessment.batch_number || 'Unknown Supplier',
          amount: assessment.suggested_price || 0,
          status: 'Pending',
          method: 'Bank Transfer',
          date: new Date().toISOString().split('T')[0],
          batch_number: assessment.batch_number,
          quality_assessment_id: data.id,
        });
      
      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      } else {
        console.log('Payment record created successfully');
      }
      
      // Refresh assessments to get the new one with ID
      await loadQualityAssessments();
      
      toast({
        title: "Success",
        description: "Quality assessment saved and sent to finance for payment processing"
      });
      
      return data;
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
      console.log('Updating quality assessment in Supabase:', id, updates);
      
      const { error } = await supabase
        .from('quality_assessments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating quality assessment:', error);
        toast({
          title: "Error",
          description: "Failed to update quality assessment",
          variant: "destructive"
        });
        throw error;
      }

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
        const { data: existingPayments } = await supabase
          .from('payment_records')
          .select('id')
          .eq('quality_assessment_id', assessmentId);
        
        if (!existingPayments || existingPayments.length === 0) {
          // Create payment record
          console.log('Creating payment record for submitted assessment');
          const { error } = await supabase
            .from('payment_records')
            .insert({
              supplier: assessment.batch_number || 'Unknown Supplier',
              amount: assessment.suggested_price || 0,
              status: 'Pending',
              method: 'Bank Transfer',
              date: new Date().toISOString().split('T')[0],
              batch_number: assessment.batch_number,
              quality_assessment_id: assessmentId,
            });
          
          if (error) {
            console.error('Error creating payment record:', error);
          } else {
            console.log('Payment record created for submitted assessment');
          }
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
