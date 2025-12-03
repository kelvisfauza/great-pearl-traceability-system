import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  lastUpdated?: string;
}

export const useReferencePrices = () => {
  const [prices, setPrices] = useState<ReferencePrices>({
    iceArabica: 185.50,
    robusta: 2450,
    exchangeRate: 3750,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800
  });
  const [loading, setLoading] = useState(false);

  // Fetch reference prices from Supabase
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('price_type', 'reference_prices')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching reference prices:', error);
        return;
      }
      
      if (data) {
        setPrices({
          iceArabica: data.ice_arabica || 185.50,
          robusta: data.robusta || 2450,
          exchangeRate: data.exchange_rate || 3750,
          drugarLocal: data.drugar_local || 8500,
          wugarLocal: data.wugar_local || 8200,
          robustaFaqLocal: data.robusta_faq_local || 7800,
          lastUpdated: data.last_updated
        });
      }
    } catch (error) {
      console.error('Error fetching reference prices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save reference prices to Supabase
  const savePrices = async (newPrices: Omit<ReferencePrices, 'lastUpdated'>) => {
    try {
      setLoading(true);
      
      const priceData = {
        ice_arabica: newPrices.iceArabica,
        robusta: newPrices.robusta,
        exchange_rate: newPrices.exchangeRate,
        drugar_local: newPrices.drugarLocal,
        wugar_local: newPrices.wugarLocal,
        robusta_faq_local: newPrices.robustaFaqLocal,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // First try to update existing record
      const { data: existing, error: selectError } = await supabase
        .from('market_prices')
        .select('id')
        .eq('price_type', 'reference_prices')
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing prices:', selectError);
        throw selectError;
      }
      
      let error;
      if (existing) {
        // Update existing record
        const result = await supabase
          .from('market_prices')
          .update(priceData)
          .eq('price_type', 'reference_prices');
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('market_prices')
          .insert({ ...priceData, price_type: 'reference_prices' });
        error = result.error;
      }
      
      if (error) {
        console.error('Error saving reference prices:', error);
        throw error;
      }
      
      // Update local state
      setPrices({
        ...newPrices,
        lastUpdated: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error saving reference prices:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    // Initial fetch
    fetchPrices();

    // Subscribe to changes
    const channel = supabase
      .channel('market_prices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_prices',
          filter: 'price_type=eq.reference_prices'
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as any;
            setPrices({
              iceArabica: data.ice_arabica || 185.50,
              robusta: data.robusta || 2450,
              exchangeRate: data.exchange_rate || 3750,
              drugarLocal: data.drugar_local || 8500,
              wugarLocal: data.wugar_local || 8200,
              robustaFaqLocal: data.robusta_faq_local || 7800,
              lastUpdated: data.last_updated
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPrices]);

  return {
    prices,
    loading,
    savePrices,
    fetchPrices
  };
};
