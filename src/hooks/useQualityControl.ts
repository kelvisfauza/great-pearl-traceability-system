
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

  const loadQualityAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQualityAssessments(data || []);
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

  const addQualityAssessment = async (assessment: Omit<QualityAssessment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('quality_assessments')
        .insert([assessment])
        .select()
        .single();

      if (error) throw error;

      setQualityAssessments(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding quality assessment:', error);
      throw error;
    }
  };

  const updateQualityAssessment = async (id: string, updates: Partial<QualityAssessment>) => {
    try {
      const { data, error } = await supabase
        .from('quality_assessments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setQualityAssessments(assessments => 
        assessments.map(assessment => 
          assessment.id === id ? data : assessment
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
