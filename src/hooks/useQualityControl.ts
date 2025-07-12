
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StoreRecord {
  id: string;
  batchNumber: string;
  coffeeType: string;
  date: string;
  kilograms: number;
  bags: number;
  supplier: string;
  status: 'pending' | 'quality_review' | 'pricing' | 'batched' | 'drying' | 'sales' | 'inventory';
}

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

  // For now, we'll use local state since we don't have database tables yet
  // This will be replaced with actual database calls once tables are created
  useEffect(() => {
    // Simulate loading from database
    setLoading(false);
  }, []);

  const addStoreRecord = (record: Omit<StoreRecord, 'id'>) => {
    const newRecord: StoreRecord = {
      ...record,
      id: Date.now().toString(),
    };
    setStoreRecords([...storeRecords, newRecord]);
  };

  const updateStoreRecord = (id: string, updates: Partial<StoreRecord>) => {
    setStoreRecords(records => 
      records.map(record => 
        record.id === id ? { ...record, ...updates } : record
      )
    );
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
  };
};
