
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // Legacy market data object for backward compatibility
  const [legacyMarketData, setLegacyMarketData] = useState({
    iceArabica: 245.50,
    robusta: 2850,
    ucdaDrugar: 11500,
    ucdaWugar: 10800,
    ucdaRobusta: 8500,
    exchangeRate: 3700
  });

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      
      // Fetch market data
      const { data: marketData, error: marketError } = await supabase
        .from('market_data')
        .select('*')
        .order('date_recorded', { ascending: false });

      if (marketError) {
        console.error('Error fetching market data:', marketError);
      } else {
        const transformedMarketData: MarketPrice[] = marketData.map(data => ({
          id: data.id,
          coffeeType: data.coffee_type,
          priceUsd: data.price_usd,
          priceUgx: data.price_ugx,
          exchangeRate: data.exchange_rate,
          marketSource: data.market_source,
          dateRecorded: data.date_recorded,
          changePercentage: data.change_percentage || 0,
          trend: data.trend || 'stable'
        }));
        setMarketPrices(transformedMarketData);
        
        // Update legacy market data if we have data
        if (transformedMarketData.length > 0) {
          const latestExchangeRate = transformedMarketData[0]?.exchangeRate || 3700;
          setLegacyMarketData(prev => ({
            ...prev,
            exchangeRate: latestExchangeRate
          }));
        }
      }

      // Fetch price forecasts
      const { data: forecastData, error: forecastError } = await supabase
        .from('price_forecasts')
        .select('*')
        .order('forecast_date', { ascending: false });

      if (forecastError) {
        console.error('Error fetching price forecasts:', forecastError);
      } else {
        const transformedForecasts: PriceForecast[] = forecastData.map(forecast => ({
          id: forecast.id,
          coffeeType: forecast.coffee_type,
          predictedPrice: forecast.predicted_price,
          forecastDate: forecast.forecast_date,
          confidenceLevel: forecast.confidence_level,
          modelUsed: forecast.model_used
        }));
        setPriceForecasts(transformedForecasts);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertCentsLbToUGXKg = (centsPerLb: number, exchangeRate: number = legacyMarketData.exchangeRate) => {
    const dollarsPerLb = centsPerLb / 100;
    const dollarsPerKg = dollarsPerLb * 2.20462;
    return dollarsPerKg * exchangeRate;
  };

  // Generate price history for charts
  const priceHistory = [
    { date: '2024-01-01', arabica: 245, drugar: 11500 },
    { date: '2024-01-02', arabica: 248, drugar: 11600 },
    { date: '2024-01-03', arabica: 246, drugar: 11450 },
    { date: '2024-01-04', arabica: 250, drugar: 11700 },
    { date: '2024-01-05', arabica: 252, drugar: 11800 },
    { date: '2024-01-06', arabica: 249, drugar: 11650 },
    { date: '2024-01-07', arabica: 245, drugar: 11500 }
  ];

  useEffect(() => {
    fetchMarketData();
  }, []);

  return {
    marketPrices,
    priceForecasts,
    loading,
    fetchMarketData,
    // Legacy properties for backward compatibility
    marketData: legacyMarketData,
    setMarketData: setLegacyMarketData,
    priceHistory,
    convertCentsLbToUGXKg
  };
};
