import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ProcurementRecommendation {
  id?: string;
  grade: string;
  action: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
  priceRange: string;
  reasoning: string;
  confidence: number;
  risk: 'Low' | 'Medium' | 'High';
  timeframe: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const useProcurementRecommendations = () => {
  const [recommendations, setRecommendations] = useState<ProcurementRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      // Procurement recommendations disabled - Firebase has been migrated to Supabase
      console.log('Procurement recommendations not available (Firebase migration)');
      setRecommendations([]);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const addRecommendation = async (recommendation: Omit<ProcurementRecommendation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Procurement recommendations disabled - Firebase has been migrated to Supabase
      console.log('Procurement recommendation add disabled (Firebase migration)');
      toast({
        title: "Feature Disabled",
        description: "Procurement recommendations are currently unavailable",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error adding recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to save recommendation",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return {
    recommendations,
    loading,
    addRecommendation,
    fetchRecommendations
  };
};