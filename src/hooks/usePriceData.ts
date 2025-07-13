
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PriceDataRow {
  id: string;
  price_type: string;
  price_value: number;
  currency: string;
  market_source: string | null;
  recorded_at: string;
}

interface PriceData {
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  iceArabica: number;
  iceRobusta: number;
  exchangeRate: number;
}

export const usePriceData = () => {
  const [prices, setPrices] = useState<PriceData>({
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800,
    iceArabica: 185.50,
    iceRobusta: 2450,
    exchangeRate: 3750
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('price_data')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const latestPrices: Partial<PriceData> = {};
        
        // Get the latest price for each type
        const priceMap = new Map();
        data.forEach(row => {
          if (!priceMap.has(row.price_type)) {
            priceMap.set(row.price_type, row.price_value);
          }
        });

        setPrices({
          drugarLocal: priceMap.get('drugar_local') || 8500,
          wugarLocal: priceMap.get('wugar_local') || 8200,
          robustaFaqLocal: priceMap.get('robusta_faq_local') || 7800,
          iceArabica: priceMap.get('ice_arabica') || 185.50,
          iceRobusta: priceMap.get('ice_robusta') || 2450,
          exchangeRate: priceMap.get('exchange_rate') || 3750
        });
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch price data from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = async (priceType: string, value: number, currency: string, marketSource: string) => {
    try {
      const { error } = await supabase
        .from('price_data')
        .insert({
          price_type: priceType,
          price_value: value,
          currency,
          market_source: marketSource
        });

      if (error) throw error;

      // Refresh prices after update
      await fetchPrices();
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: "Error",
        description: "Failed to update price in database",
        variant: "destructive"
      });
    }
  };

  const updateLocalPrices = async (localPrices: { drugar: number; wugar: number; robusta: number }) => {
    try {
      const updates = [
        { price_type: 'drugar_local', price_value: localPrices.drugar, currency: 'UGX', market_source: 'local_reference' },
        { price_type: 'wugar_local', price_value: localPrices.wugar, currency: 'UGX', market_source: 'local_reference' },
        { price_type: 'robusta_faq_local', price_value: localPrices.robusta, currency: 'UGX', market_source: 'local_reference' }
      ];

      for (const update of updates) {
        await updatePrice(update.price_type, update.price_value, update.currency, update.market_source);
      }

      toast({
        title: "Success",
        description: "Local reference prices updated successfully",
      });
    } catch (error) {
      console.error('Error updating local prices:', error);
    }
  };

  const updateMarketPrices = async (marketPrices: { iceArabica: number; iceRobusta: number }) => {
    try {
      const updates = [
        { price_type: 'ice_arabica', price_value: marketPrices.iceArabica, currency: 'USD_CENTS', market_source: 'ICE' },
        { price_type: 'ice_robusta', price_value: marketPrices.iceRobusta, currency: 'USD', market_source: 'ICE' }
      ];

      for (const update of updates) {
        await updatePrice(update.price_type, update.price_value, update.currency, update.market_source);
      }
    } catch (error) {
      console.error('Error updating market prices:', error);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  return {
    prices,
    loading,
    updateLocalPrices,
    updateMarketPrices,
    refreshPrices: fetchPrices
  };
};
