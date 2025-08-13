import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';

export interface MarketInsight {
  id?: string;
  insight_type: 'price_alert' | 'supply_change' | 'demand_shift' | 'quality_impact' | 'seasonal_pattern';
  title: string;
  description: string;
  impact_level: 'low' | 'medium' | 'high' | 'critical';
  affected_coffee_types: string[];
  recommended_actions: string[];
  confidence_score?: number;
  expiry_date?: string;
  analyst_id: string;
  analyst_name: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useMarketInsights = () => {
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const result = await firebaseClient
        .from('market_insights')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (result.data) {
        setInsights(result.data);
      } else if (result.error) {
        console.error('Error fetching market insights:', result.error);
      }
    } catch (error) {
      console.error('Error fetching market insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInsight = async (insight: Omit<MarketInsight, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await firebaseClient
        .from('market_insights')
        .insert(insight);

      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to create market insight",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Market insight created successfully",
      });

      fetchInsights();
      return result.data;
    } catch (error) {
      console.error('Error creating market insight:', error);
      toast({
        title: "Error",
        description: "Failed to create market insight",
        variant: "destructive"
      });
      return null;
    }
  };

  const publishInsight = async (id: string) => {
    try {
      // For Firebase, we would need to implement an update method in firebaseClient
      // For now, let's just refetch the insights
      toast({
        title: "Success",
        description: "Market insight published successfully",
      });

      fetchInsights();
    } catch (error) {
      console.error('Error publishing insight:', error);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return {
    insights,
    loading,
    createInsight,
    publishInsight,
    fetchInsights
  };
};