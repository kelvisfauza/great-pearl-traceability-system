
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface StoreRecord extends Tables<'coffee_records'> {}

export interface QualityAssessment {
  id: string;
  storeRecordId: string;
  batchNumber: string;
  moisture: number;
  group1Defects: number;
  group2Defects: number;
  below12: number;
  pods: number;
  husks: number;
  stones: number;
  suggestedPrice: number;
  status: 'assessed' | 'submitted_to_finance' | 'price_requested' | 'approved' | 'dispatched';
  comments?: string;
  dateAssessed: string;
  assessedBy: string;
}

export const useQualityControl = () => {
  const [storeRecords, setStoreRecords] = useState<StoreRecord[]>([]);
  const [qualityAssessments, setQualityAssessments] = useState<QualityAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    loadStoreRecords();
  }, []);

  const loadStoreRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .in('status', ['pending', 'quality_review', 'pricing', 'batched', 'drying'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStoreRecords(data || []);
    } catch (error) {
      console.error('Error loading store records:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStoreRecord = (record: Omit<StoreRecord, 'id'>) => {
    // This method is kept for compatibility but data should be added through Store Management
    console.log('Store records should be added through Store Management');
  };

  const updateStoreRecord = async (id: string, updates: Partial<StoreRecord>) => {
    try {
      const { data, error } = await supabase
        .from('coffee_records')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setStoreRecords(records => 
        records.map(record => 
          record.id === id ? data : record
        )
      );
    } catch (error) {
      console.error('Error updating store record:', error);
      throw error;
    }
  };

  const addQualityAssessment = (assessment: Omit<QualityAssessment, 'id'>) => {
    const newAssessment: QualityAssessment = {
      ...assessment,
      id: Date.now().toString(),
    };
    setQualityAssessments([...qualityAssessments, newAssessment]);
  };

  const updateQualityAssessment = (id: string, updates: Partial<QualityAssessment>) => {
    setQualityAssessments(assessments => 
      assessments.map(assessment => 
        assessment.id === id ? { ...assessment, ...updates } : assessment
      )
    );
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
    refreshData: loadStoreRecords,
  };
};
