
import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';
import { Tables } from '@/integrations/supabase/types';

export interface StoreRecord extends Tables<'coffee_records'> {}

export interface QualityAssessment extends Tables<'quality_assessments'> {}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Firebase
  useEffect(() => {
    loadStoreRecords();
    loadQualityAssessments();
  }, []);

  const loadStoreRecords = async () => {
    setLoading(true);
    try {
      console.log('Loading store records from Firebase...');
      
      const { data, error } = await firebaseClient
        .from('coffee_records')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (error) {
        console.error('Error loading store records:', error);
        setStoreRecords([]);
        return;
      }

      console.log('Raw Firebase store records:', data);
      
      // Transform Firebase data to match StoreRecord interface
      const transformedRecords = (data || []).map((record: any) => ({
        id: record.id,
        coffee_type: record.coffee_type,
        date: record.date,
        kilograms: record.kilograms,
        bags: record.bags,
        supplier_id: record.supplier_id,
        supplier_name: record.supplier_name,
        status: record.status,
        batch_number: record.batch_number,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));

      console.log('Transformed store records:', transformedRecords);
      setStoreRecords(transformedRecords);
    } catch (error) {
      console.error('Error loading store records:', error);
      setStoreRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadQualityAssessments = async () => {
    try {
      console.log('Loading quality assessments from Firebase...');
      
      const { data, error } = await firebaseClient
        .from('quality_assessments')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (error) {
        console.error('Error loading quality assessments:', error);
        setQualityAssessments([]);
        return;
      }

      console.log('Raw Firebase quality assessments:', data);
      
      // Transform Firebase data to match QualityAssessment interface
      const transformedAssessments = (data || []).map((assessment: any) => ({
        id: assessment.id,
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
        status: assessment.status,
        comments: assessment.comments,
        date_assessed: assessment.date_assessed,
        assessed_by: assessment.assessed_by,
        created_at: assessment.created_at,
        updated_at: assessment.updated_at
      }));

      console.log('Transformed quality assessments:', transformedAssessments);
      setQualityAssessments(transformedAssessments);
    } catch (error) {
      console.error('Error loading quality assessments:', error);
      setQualityAssessments([]);
    }
  };

  const addStoreRecord = (record: Omit<StoreRecord, 'id'>) => {
    // This method is kept for compatibility but data should be added through Store Management
    console.log('Store records should be added through Store Management');
  };

  const updateStoreRecord = async (id: string, updates: Partial<StoreRecord>) => {
    try {
      console.log('Updating store record in Firebase:', id, updates);
      
      const { data, error } = await firebaseClient
        .from('coffee_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Firebase update error:', error);
        throw error;
      }

      console.log('Store record updated successfully:', data);
      
      // Update local state
      setStoreRecords(records => 
        records.map(record => 
          record.id === id ? { ...record, ...updates } : record
        )
      );
      
      // Refresh data to ensure consistency
      await loadStoreRecords();
    } catch (error) {
      console.error('Error updating store record:', error);
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
        status: assessment.status,
        comments: assessment.comments || null,
        date_assessed: assessment.date_assessed,
        assessed_by: assessment.assessed_by
      };

      const { data, error } = await firebaseClient
        .from('quality_assessments')
        .insert(assessmentToAdd);

      if (error) {
        console.error('Firebase insert error:', error);
        throw error;
      }

      console.log('Quality assessment added successfully:', data);
      
      // Refresh assessments to get the new one with ID
      await loadQualityAssessments();
      
      return data;
    } catch (error) {
      console.error('Error adding quality assessment:', error);
      throw error;
    }
  };

  const updateQualityAssessment = async (id: string, updates: Partial<QualityAssessment>) => {
    try {
      console.log('Updating quality assessment in Firebase:', id, updates);
      
      const { data, error } = await firebaseClient
        .from('quality_assessments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Firebase update error:', error);
        throw error;
      }

      console.log('Quality assessment updated successfully:', data);
      
      // Update local state
      setQualityAssessments(assessments => 
        assessments.map(assessment => 
          assessment.id === id ? { ...assessment, ...updates } : assessment
        )
      );
      
      // Refresh data to ensure consistency
      await loadQualityAssessments();
    } catch (error) {
      console.error('Error updating quality assessment:', error);
      throw error;
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
    refreshData: () => {
      loadStoreRecords();
      loadQualityAssessments();
    },
  };
};
