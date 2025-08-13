import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';

export interface TrendAnalysis {
  id?: string;
  analysis_type: 'price' | 'quality' | 'supply' | 'demand' | 'seasonal';
  coffee_type: string;
  time_period: string;
  trend_direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trend_strength: number;
  key_factors: string[];
  predicted_outcome?: string;
  data_points?: any;
  analyst_id: string;
  analyst_name: string;
  created_at?: string;
  updated_at?: string;
}

export const useTrendAnalysis = () => {
  const [trends, setTrends] = useState<TrendAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const result = await firebaseClient
        .from('trend_analysis')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (result.data) {
        setTrends(result.data);
      } else if (result.error) {
        console.error('Error fetching trend analysis:', result.error);
      }
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTrendAnalysis = async (trend: Omit<TrendAnalysis, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await firebaseClient
        .from('trend_analysis')
        .insert(trend);

      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to create trend analysis",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Trend analysis created successfully",
      });

      fetchTrends();
      return result.data;
    } catch (error) {
      console.error('Error creating trend analysis:', error);
      toast({
        title: "Error",
        description: "Failed to create trend analysis",
        variant: "destructive"
      });
      return null;
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  return {
    trends,
    loading,
    createTrendAnalysis,
    fetchTrends
  };
};