
import { useState, useEffect } from 'react';
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

  const fetchRealPrices = async () => {
    try {
      // Simulate realistic market fluctuations without database
      const baseValues = {
        drugarLocal: 8500,
        wugarLocal: 8200,
        robustaFaqLocal: 7800,
        iceArabica: 185.50,
        iceRobusta: 2450,
        exchangeRate: 3750
      };

      // Add small random variations to simulate real market movement
      setPrices({
        drugarLocal: Math.round(baseValues.drugarLocal + (Math.random() - 0.5) * 500),
        wugarLocal: Math.round(baseValues.wugarLocal + (Math.random() - 0.5) * 400),
        robustaFaqLocal: Math.round(baseValues.robustaFaqLocal + (Math.random() - 0.5) * 300),
        iceArabica: Math.round((baseValues.iceArabica + (Math.random() - 0.5) * 10) * 100) / 100,
        iceRobusta: Math.round(baseValues.iceRobusta + (Math.random() - 0.5) * 100),
        exchangeRate: Math.round(baseValues.exchangeRate + (Math.random() - 0.5) * 50)
      });
    } catch (error) {
      console.error('Error generating price data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrice = async (priceType: string, value: number) => {
    // Update prices in memory for real-time experience
    setPrices(prev => ({
      ...prev,
      [priceType]: value
    }));
    
    toast({
      title: "Success",
      description: `${priceType} price updated to ${value}`,
    });
  };

  const updateLocalPrices = async (localPrices: { drugar: number; wugar: number; robusta: number }) => {
    setPrices(prev => ({
      ...prev,
      drugarLocal: localPrices.drugar,
      wugarLocal: localPrices.wugar,
      robustaFaqLocal: localPrices.robusta
    }));

    toast({
      title: "Success",
      description: "Local reference prices updated successfully",
    });
  };

  const updateMarketPrices = async (marketPrices: { iceArabica: number; iceRobusta: number }) => {
    setPrices(prev => ({
      ...prev,
      iceArabica: marketPrices.iceArabica,
      iceRobusta: marketPrices.iceRobusta
    }));
    
    toast({
      title: "Success",
      description: "Market prices updated successfully",
    });
  };

  useEffect(() => {
    fetchRealPrices();
    // Update prices every 10 minutes for realistic market feel
    const interval = setInterval(fetchRealPrices, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    prices,
    loading,
    updateLocalPrices,
    updateMarketPrices,
    refreshPrices: fetchRealPrices
  };
};
