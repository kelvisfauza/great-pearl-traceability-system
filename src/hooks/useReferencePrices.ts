import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  // Arabica parameters
  arabicaOutturn: number;
  arabicaMoisture: number;
  arabicaFm: number;
  arabicaBuyingPrice: number;
  // Robusta parameters
  robustaOutturn: number;
  robustaMoisture: number;
  robustaFm: number;
  robustaBuyingPrice: number;
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
    arabicaOutturn: 70,
    arabicaMoisture: 12.5,
    arabicaFm: 5,
    arabicaBuyingPrice: 8500,
    robustaOutturn: 80,
    robustaMoisture: 13,
    robustaFm: 3,
    robustaBuyingPrice: 7800
  });
  const [loading, setLoading] = useState(false);

  // Fetch reference prices from Supabase
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);

      // If auth isn't initialized yet, RLS may return 0 rows; we'll refetch on SIGNED_IN.
      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .eq('price_type', 'reference_prices')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching reference prices:', error);
        return;
      }

      // When not signed in yet, market_prices is not readable (RLS), so data can be null.
      if (!session && !data) return;
      
      if (data) {
        setPrices({
          iceArabica: data.ice_arabica || 185.50,
          robusta: data.robusta || 2450,
          exchangeRate: data.exchange_rate || 3750,
          drugarLocal: data.drugar_local || 8500,
          wugarLocal: data.wugar_local || 8200,
          robustaFaqLocal: data.robusta_faq_local || 7800,
          arabicaOutturn: data.arabica_outturn || 70,
          arabicaMoisture: data.arabica_moisture || 12.5,
          arabicaFm: data.arabica_fm || 5,
          arabicaBuyingPrice: data.arabica_buying_price || 8500,
          robustaOutturn: data.robusta_outturn || 80,
          robustaMoisture: data.robusta_moisture || 13,
          robustaFm: data.robusta_fm || 3,
          robustaBuyingPrice: data.robusta_buying_price || 7800,
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
        arabica_outturn: newPrices.arabicaOutturn,
        arabica_moisture: newPrices.arabicaMoisture,
        arabica_fm: newPrices.arabicaFm,
        arabica_buying_price: newPrices.arabicaBuyingPrice,
        robusta_outturn: newPrices.robustaOutturn,
        robusta_moisture: newPrices.robustaMoisture,
        robusta_fm: newPrices.robustaFm,
        robusta_buying_price: newPrices.robustaBuyingPrice,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('💾 Price data to save:', priceData);
      
      // First try to update existing record
      const { data: existing, error: selectError } = await supabase
        .from('market_prices')
        .select('id')
        .eq('price_type', 'reference_prices')
        .maybeSingle();
      
      console.log('💾 Existing record:', existing, 'Select error:', selectError);
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Error checking existing prices:', selectError);
        throw selectError;
      }
      
      let error;
      if (existing) {
        console.log('💾 Updating existing record with id:', existing.id);
        const result = await supabase
          .from('market_prices')
          .update(priceData)
          .eq('price_type', 'reference_prices');
        error = result.error;
        console.log('💾 Update result error:', result.error);
      } else {
        console.log('💾 Inserting new record');
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
    fetchPrices();

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchPrices();
      }
    });

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
              arabicaOutturn: data.arabica_outturn || 70,
              arabicaMoisture: data.arabica_moisture || 12.5,
              arabicaFm: data.arabica_fm || 5,
              arabicaBuyingPrice: data.arabica_buying_price || 8500,
              robustaOutturn: data.robusta_outturn || 80,
              robustaMoisture: data.robusta_moisture || 13,
              robustaFm: data.robusta_fm || 3,
              robustaBuyingPrice: data.robusta_buying_price || 7800,
              lastUpdated: data.last_updated
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      authSubscription.unsubscribe();
    };
  }, [fetchPrices]);

  return {
    prices,
    loading,
    savePrices,
    fetchPrices
  };
};
