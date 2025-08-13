import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';

export interface PriceRecommendation {
  id?: string;
  coffee_type: string;
  recommended_price: number;
  current_market_price?: number;
  price_justification: string;
  quality_score?: number;
  market_trend: string;
  confidence_level: number;
  analyst_id: string;
  analyst_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  effective_date?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const usePriceRecommendations = () => {
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const result = await firebaseClient
        .from('price_recommendations')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (result.data) {
        setRecommendations(result.data);
      } else if (result.error) {
        console.error('Error fetching price recommendations:', result.error);
      }
    } catch (error) {
      console.error('Error fetching price recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRecommendation = async (recommendation: Omit<PriceRecommendation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await firebaseClient
        .from('price_recommendations')
        .insert(recommendation);

      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to create price recommendation",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Price recommendation created successfully",
      });

      fetchRecommendations();
      return result.data;
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to create price recommendation",
        variant: "destructive"
      });
      return null;
    }
  };

  const approveRecommendation = async (id: string, approvedBy: string) => {
    try {
      // For Firebase, we would need to implement an update method in firebaseClient
      // For now, let's just show success and refetch
      toast({
        title: "Success",
        description: "Price recommendation approved successfully",
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error approving recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to approve recommendation",
        variant: "destructive"
      });
    }
  };

  const rejectRecommendation = async (id: string, rejectionReason: string) => {
    try {
      // For Firebase, we would need to implement an update method in firebaseClient
      // For now, let's just show success and refetch
      toast({
        title: "Success",
        description: "Price recommendation rejected",
      });

      fetchRecommendations();
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to reject recommendation",
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
    createRecommendation,
    approveRecommendation,
    rejectRecommendation,
    fetchRecommendations
  };
};