
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface StoreRecord extends Tables<'coffee_records'> {}

export interface QualityAssessment extends Tables<'quality_assessments'> {}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    loadStoreRecords();
    loadQualityAssessments();
  }, []);

  const loadStoreRecords = async () => {
    setLoading(true);
    try {
      // Mock data during Firebase migration
      console.log('Loading store records...');
      setStoreRecords([]);
    } catch (error) {
      console.error('Error loading store records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQualityAssessments = async () => {
    try {
      // Mock data during Firebase migration
      console.log('Loading quality assessments...');
      setQualityAssessments([]);
    } catch (error) {
      console.error('Error loading quality assessments:', error);
    }
  };

  const addStoreRecord = (record: Omit<StoreRecord, 'id'>) => {
    // This method is kept for compatibility but data should be added through Store Management
    console.log('Store records should be added through Store Management');
  };

  const updateStoreRecord = async (id: string, updates: Partial<StoreRecord>) => {
    try {
      console.log('Updating store record:', id, updates);
      
      setStoreRecords(records => 
        records.map(record => 
          record.id === id ? { ...record, ...updates } : record
        )
      );
    } catch (error) {
      console.error('Error updating store record:', error);
      throw error;
    }
  };

  const addQualityAssessment = async (assessment: Omit<QualityAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding quality assessment:', assessment);
      
      const newAssessment = {
        ...assessment,
        id: `qa-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as QualityAssessment;

      setQualityAssessments(prev => [newAssessment, ...prev]);
      return newAssessment;
    } catch (error) {
      console.error('Error adding quality assessment:', error);
      throw error;
    }
  };

  const updateQualityAssessment = async (id: string, updates: Partial<QualityAssessment>) => {
    try {
      console.log('Updating quality assessment:', id, updates);
      
      setQualityAssessments(assessments => 
        assessments.map(assessment => 
          assessment.id === id ? { ...assessment, ...updates } : assessment
        )
      );
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
