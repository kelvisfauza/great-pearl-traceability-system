
import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePriceData } from '@/hooks/usePriceData';

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
  const { prices: dbPrices } = usePriceData();
  
  const [prices, setPrices] = useState<PriceData>({
    iceArabica: 185.50,
    robusta: 2450,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800,
    exchangeRate: 3750
  });

  // Update context prices when database prices change
  useEffect(() => {
    setPrices({
      iceArabica: dbPrices.iceArabica,
      robusta: dbPrices.iceRobusta,
      drugarLocal: dbPrices.drugarLocal,
      wugarLocal: dbPrices.wugarLocal,
      robustaFaqLocal: dbPrices.robustaFaqLocal,
      exchangeRate: dbPrices.exchangeRate
    });
  }, [dbPrices]);

  const updatePrices = (newPrices: Partial<PriceData>) => {
    setPrices(prev => ({ ...prev, ...newPrices }));
  };

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
