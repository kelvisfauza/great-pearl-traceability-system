
import { useState, useEffect } from 'react';
import { usePrices } from '@/contexts/PriceContext';

export interface MarketPrice {
  id: string;
  coffeeType: string;
  priceUsd: number;
  priceUgx: number;
  exchangeRate: number;
  marketSource: string;
  dateRecorded: string;
  changePercentage: number;
  trend: string;
}

export interface PriceForecast {
  id: string;
  coffeeType: string;
  predictedPrice: number;
  forecastDate: string;
  confidenceLevel: number;
  modelUsed: string;
}

export const useMarketData = () => {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [priceForecasts, setPriceForecasts] = useState<PriceForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const { prices: contextPrices } = usePrices();

  // Use context prices as legacy market data for backward compatibility
  const [legacyMarketData, setLegacyMarketData] = useState({
    iceArabica: 245.50,
    robusta: 2850,
    ucdaDrugar: 11500,
    ucdaWugar: 10800,
    ucdaRobusta: 8500,
    exchangeRate: 3700
  });

  // Update legacy market data when context prices change
  useEffect(() => {
    setLegacyMarketData({
      iceArabica: contextPrices.iceArabica,
      robusta: contextPrices.robusta,
      ucdaDrugar: contextPrices.drugarLocal,
      ucdaWugar: contextPrices.wugarLocal,
      ucdaRobusta: contextPrices.robustaFaqLocal,
      exchangeRate: contextPrices.exchangeRate
    });
  }, [contextPrices]);

  const fetchRealMarketData = async () => {
    try {
      setLoading(true);
      
      // Simulate real market data with realistic fluctuations
      const currentDate = new Date().toISOString().split('T')[0];
      
      // ICE Arabica (US Coffee Futures) - typical range 150-250 cents/lb
      const baseArabica = 185.50;
      const arabicaVariation = (Math.random() - 0.5) * 10; // ±5 cents
      const arabicaPrice = Math.max(150, Math.min(250, baseArabica + arabicaVariation));
      
      // London Robusta Futures - typical range 2000-3000 USD/MT
      const baseRobusta = 2450;
      const robustaVariation = (Math.random() - 0.5) * 200; // ±100 USD
      const robustaPrice = Math.max(2000, Math.min(3000, baseRobusta + robustaVariation));
      
      // Local Wugar prices - typical range 7000-12000 UGX/kg
      const baseWugar = 10800;
      const wugarVariation = (Math.random() - 0.5) * 1000; // ±500 UGX
      const wugarPrice = Math.max(7000, Math.min(12000, baseWugar + wugarVariation));
      
      const exchangeRate = 3700 + (Math.random() - 0.5) * 100; // ±50 UGX per USD
      
      const mockMarketData: MarketPrice[] = [
        {
          id: '1',
          coffeeType: 'Arabica',
          priceUsd: arabicaPrice,
          priceUgx: arabicaPrice * 22.046 * exchangeRate / 100, // Convert cents/lb to UGX/kg
          exchangeRate,
          marketSource: 'ICE US Coffee Futures',
          dateRecorded: currentDate,
          changePercentage: arabicaVariation / baseArabica * 100,
          trend: arabicaVariation > 0 ? 'up' : arabicaVariation < 0 ? 'down' : 'stable'
        },
        {
          id: '2',
          coffeeType: 'Robusta',
          priceUsd: robustaPrice,
          priceUgx: robustaPrice * exchangeRate,
          exchangeRate,
          marketSource: 'London Coffee (LIFFE)',
          dateRecorded: currentDate,
          changePercentage: robustaVariation / baseRobusta * 100,
          trend: robustaVariation > 0 ? 'up' : robustaVariation < 0 ? 'down' : 'stable'
        },
        {
          id: '3',
          coffeeType: 'Wugar',
          priceUsd: wugarPrice / exchangeRate,
          priceUgx: wugarPrice,
          exchangeRate,
          marketSource: 'Local Market',
          dateRecorded: currentDate,
          changePercentage: wugarVariation / baseWugar * 100,
          trend: wugarVariation > 0 ? 'up' : wugarVariation < 0 ? 'down' : 'stable'
        }
      ];
      
      setMarketPrices(mockMarketData);
      
      // Mock price forecasts
      const mockForecasts: PriceForecast[] = [
        {
          id: '1',
          coffeeType: 'Arabica',
          predictedPrice: arabicaPrice + 5,
          forecastDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidenceLevel: 0.85,
          modelUsed: 'Technical Analysis'
        },
        {
          id: '2',
          coffeeType: 'Robusta',
          predictedPrice: robustaPrice + 50,
          forecastDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidenceLevel: 0.82,
          modelUsed: 'Market Sentiment'
        }
      ];
      
      setPriceForecasts(mockForecasts);
      
    } catch (error) {
      console.error('Error fetching real market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertCentsLbToUGXKg = (centsPerLb: number, exchangeRate: number = contextPrices.exchangeRate) => {
    const dollarsPerLb = centsPerLb / 100;
    const dollarsPerKg = dollarsPerLb * 2.20462;
    return dollarsPerKg * exchangeRate;
  };

  // Generate price history for charts using context prices
  const priceHistory = [
    { date: '2024-01-01', arabica: contextPrices.iceArabica, drugar: contextPrices.drugarLocal },
    { date: '2024-01-02', arabica: contextPrices.iceArabica + 3, drugar: contextPrices.drugarLocal + 100 },
    { date: '2024-01-03', arabica: contextPrices.iceArabica - 2, drugar: contextPrices.drugarLocal - 50 },
    { date: '2024-01-04', arabica: contextPrices.iceArabica + 5, drugar: contextPrices.drugarLocal + 200 },
    { date: '2024-01-05', arabica: contextPrices.iceArabica + 7, drugar: contextPrices.drugarLocal + 300 },
    { date: '2024-01-06', arabica: contextPrices.iceArabica + 4, drugar: contextPrices.drugarLocal + 150 },
    { date: '2024-01-07', arabica: contextPrices.iceArabica, drugar: contextPrices.drugarLocal }
  ];

  useEffect(() => {
    fetchRealMarketData();
    // Refresh data every 5 minutes for real-time feel
    const interval = setInterval(fetchRealMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    marketPrices,
    priceForecasts,
    loading,
    fetchMarketData: fetchRealMarketData,
    // Legacy properties for backward compatibility - now using data analyst prices
    marketData: legacyMarketData,
    setMarketData: setLegacyMarketData,
    priceHistory,
    convertCentsLbToUGXKg
  };
};
