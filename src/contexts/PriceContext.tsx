
import React, { createContext, useContext, useState, useEffect } from 'react';
import { barchartService } from '@/services/barchartService';

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
  refreshPrices: () => Promise<void>;
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  const refreshPrices = async () => {
    try {
      setLoading(true);
      console.log('Refreshing prices from Firebase...');
      
      const data = await barchartService.getCoffeePrices();
      setPrices(data);
      
      console.log('Prices refreshed successfully:', data);
    } catch (error) {
      console.error('Error refreshing prices:', error);
      // Keep current prices on error
      setPrices({
        iceArabica: 185.50,
        robusta: 2450,
        drugarLocal: 8500,
        wugarLocal: 8200,
        robustaFaqLocal: 7800,
        exchangeRate: 3750
      });
    } finally {
      setLoading(false);
    }
  };

  // Load prices on component mount and set up periodic refresh
  useEffect(() => {
    // Initial price fetch from Firebase
    refreshPrices();
    
    // Set up periodic refresh every 30 minutes
    const interval = setInterval(refreshPrices, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const updatePrices = (newPrices: Partial<PriceData>) => {
    console.log('Updating prices locally:', newPrices);
    setPrices(prev => ({ ...prev, ...newPrices }));
  };

  return (
    <PriceContext.Provider value={{ prices, updatePrices, refreshPrices, loading }}>
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
