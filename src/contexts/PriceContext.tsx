
import React, { createContext, useContext, useState, useEffect } from 'react';

interface PriceData {
  iceArabica: number;
  robusta: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  exchangeRate: number;
}

interface PriceContextType {
  prices: PriceData;
  updatePrices: (newPrices: Partial<PriceData>) => void;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<PriceData>({
    iceArabica: 185.50,
    robusta: 2450,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800,
    exchangeRate: 3750
  });

  const updatePrices = (newPrices: Partial<PriceData>) => {
    setPrices(prev => ({ ...prev, ...newPrices }));
  };

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => ({
        ...prev,
        iceArabica: prev.iceArabica + (Math.random() - 0.5) * 2,
        robusta: prev.robusta + (Math.random() - 0.5) * 50,
        drugarLocal: prev.drugarLocal + (Math.random() - 0.5) * 100,
        wugarLocal: prev.wugarLocal + (Math.random() - 0.5) * 100,
        robustaFaqLocal: prev.robustaFaqLocal + (Math.random() - 0.5) * 100
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <PriceContext.Provider value={{ prices, updatePrices }}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePrices = () => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrices must be used within a PriceProvider');
  }
  return context;
};
