import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  outturn: number;
  moisture: number;
  fm: number;
  buyingPrice: number;
  lastUpdated?: string;
}

export const useReferencePrices = () => {
  const [prices, setPrices] = useState<ReferencePrices>({
    iceArabica: 185.50,
    robusta: 2450,
    exchangeRate: 3750,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800,
    outturn: 70,
    moisture: 12.5,
    fm: 5,
    buyingPrice: 8500
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
          outturn: data.outturn || 70,
          moisture: data.moisture || 12.5,
          fm: data.fm || 5,
          buyingPrice: data.buying_price || 8500,
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
      
      console.log('💾 Starting save prices operation...');
      
      const priceData = {
        ice_arabica: newPrices.iceArabica,
        robusta: newPrices.robusta,
        exchange_rate: newPrices.exchangeRate,
        drugar_local: newPrices.drugarLocal,
        wugar_local: newPrices.wugarLocal,
        robusta_faq_local: newPrices.robustaFaqLocal,
        outturn: newPrices.outturn,
        moisture: newPrices.moisture,
        fm: newPrices.fm,
        buying_price: newPrices.buyingPrice,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Price data to save:', priceData);
      
      // First try to update existing record
      const { data: existing, error: selectError } = await supabase
        .from('market_prices')
        .select('id')
        .eq('price_type', 'reference_prices')
        .single();
      
      console.log('💾 Existing record:', existing, 'Select error:', selectError);
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Error checking existing prices:', selectError);
        throw selectError;
      }
      
      let error;
      if (existing) {
        console.log('💾 Updating existing record with id:', existing.id);
        // Update existing record
        const result = await supabase
          .from('market_prices')
          .update(priceData)
          .eq('price_type', 'reference_prices');
        error = result.error;
        console.log('💾 Update result error:', result.error);
      } else {
        console.log('💾 Inserting new record');
        // Insert new record
        const result = await supabase
          .from('market_prices')
          .insert({ ...priceData, price_type: 'reference_prices' });
        error = result.error;
        console.log('💾 Insert result error:', result.error);
      }
      
      if (error) {
        console.error('❌ Error saving reference prices:', error);
        throw error;
      }
      
      console.log('✅ Prices saved successfully');
      
      // Update local state
      setPrices({
        ...newPrices,
        lastUpdated: new Date().toISOString()
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ Error saving reference prices:', error);
      console.error('❌ Error details:', error?.message, error?.code, error?.details);
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
              outturn: data.outturn || 70,
              moisture: data.moisture || 12.5,
              fm: data.fm || 5,
              buyingPrice: data.buying_price || 8500,
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
