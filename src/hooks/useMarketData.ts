
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

  useEffect(() => {
    fetchMarketData();
  }, []);

  return {
    marketPrices,
    priceForecasts,
    loading,
    fetchMarketData
  };
};
