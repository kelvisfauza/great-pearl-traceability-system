
import { useState, useEffect } from 'react';

export interface MarketData {
  iceArabica: number;
  robusta: number;
  ucdaDrugar: number;
  ucdaWugar: number;
  ucdaRobusta: number;
  exchangeRate: number;
}

export interface PriceHistory {
  date: string;
  arabica: number;
  robusta: number;
  drugar: number;
}

export const useMarketData = () => {
  const [marketData, setMarketData] = useState<MarketData>({
    iceArabica: 155.50,
    robusta: 2450,
    ucdaDrugar: 8500,
    ucdaWugar: 7800,
    ucdaRobusta: 6200,
    exchangeRate: 3750
  });

  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([
    { date: '2025-01-01', arabica: 150, robusta: 2400, drugar: 8200 },
    { date: '2025-01-02', arabica: 152, robusta: 2420, drugar: 8300 },
    { date: '2025-01-03', arabica: 155, robusta: 2450, drugar: 8500 },
    { date: '2025-01-04', arabica: 154, robusta: 2430, drugar: 8400 },
    { date: '2025-01-05', arabica: 156, robusta: 2470, drugar: 8600 },
    { date: '2025-01-06', arabica: 153, robusta: 2440, drugar: 8350 },
    { date: '2025-01-07', arabica: 157, robusta: 2480, drugar: 8700 }
  ]);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => ({
        ...prev,
        iceArabica: prev.iceArabica + (Math.random() - 0.5) * 2,
        robusta: prev.robusta + (Math.random() - 0.5) * 50,
        ucdaDrugar: prev.ucdaDrugar + (Math.random() - 0.5) * 100
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const convertUSDToUGX = (usdPrice: number) => Math.round(usdPrice * marketData.exchangeRate);
  const convertCentsLbToUGXKg = (centsPerLb: number) => Math.round((centsPerLb / 100) * 2.20462 * marketData.exchangeRate);

  return {
    marketData,
    setMarketData,
    priceHistory,
    convertUSDToUGX,
    convertCentsLbToUGXKg
  };
};
