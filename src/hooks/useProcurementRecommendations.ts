import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { firebaseClient } from '@/lib/firebaseClient';

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
      console.log('Fetching procurement recommendations from Firebase...');
      
      const result = await firebaseClient
        .from('procurement_recommendations')
        .select()
        .order('created_at', { ascending: false })
        .get();

      console.log('Procurement recommendations fetch result:', result);

      if (result.data) {
        console.log('Fetched procurement recommendations:', result.data.length, 'recommendations');
        setRecommendations(result.data);
      } else if (result.error) {
        console.error('Error fetching recommendations:', result.error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const addRecommendation = async (recommendation: Omit<ProcurementRecommendation, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await firebaseClient
        .from('procurement_recommendations')
        .insert({
          ...recommendation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (result.data) {
        toast({
          title: "Success",
          description: "Procurement recommendation saved successfully",
        });
        fetchRecommendations(); // Refresh the list
      } else if (result.error) {
        toast({
          title: "Error",
          description: "Failed to save recommendation",
          variant: "destructive"
        });
      }
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