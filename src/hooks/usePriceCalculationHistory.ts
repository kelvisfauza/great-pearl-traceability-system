import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PriceCalculation {
  id: string;
  coffee_type: 'robusta' | 'arabica';
  ice_price: number;
  multiplier: number;
  market_price: number;
  gpcf_price: number;
  calculated_by: string;
  calculated_at: string;
}

export const usePriceCalculationHistory = () => {
  const [history, setHistory] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('price_calculation_history')
        .select('*')
        .order('calculated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as PriceCalculation[]);
    } catch (error) {
      console.error('Error fetching calculation history:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveCalculation = async (
    coffeeType: 'robusta' | 'arabica',
    icePrice: number,
    multiplier: number,
    marketPrice: number,
    gpcfPrice: number,
    calculatedBy: string
  ) => {
    try {
      const { error } = await supabase
        .from('price_calculation_history')
        .insert({
          coffee_type: coffeeType,
          ice_price: icePrice,
          multiplier: multiplier,
          market_price: marketPrice,
          gpcf_price: gpcfPrice,
          calculated_by: calculatedBy
        });

      if (error) throw error;
      
      await fetchHistory();
      return true;
    } catch (error) {
      console.error('Error saving calculation:', error);
      throw error;
    }
  };

  const saveBothCalculations = async (
    robusta: { icePrice: number; multiplier: number; marketPrice: number; gpcfPrice: number },
    arabica: { icePrice: number; multiplier: number; marketPrice: number; gpcfPrice: number },
    calculatedBy: string
  ) => {
    try {
      const { error } = await supabase
        .from('price_calculation_history')
        .insert([
          {
            coffee_type: 'robusta',
            ice_price: robusta.icePrice,
            multiplier: robusta.multiplier,
            market_price: robusta.marketPrice,
            gpcf_price: robusta.gpcfPrice,
            calculated_by: calculatedBy
          },
          {
            coffee_type: 'arabica',
            ice_price: arabica.icePrice,
            multiplier: arabica.multiplier,
            market_price: arabica.marketPrice,
            gpcf_price: arabica.gpcfPrice,
            calculated_by: calculatedBy
          }
        ]);

      if (error) throw error;
      
      toast({
        title: "Calculations Saved",
        description: "Both Robusta and Arabica calculations have been saved to history"
      });
      
      await fetchHistory();
      return true;
    } catch (error: any) {
      console.error('Error saving calculations:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save calculations",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    saveCalculation,
    saveBothCalculations,
    fetchHistory
  };
};
