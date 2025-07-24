
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

  const fetchFromBarchartAPI = async () => {
    try {
      setLoading(true);
      console.log('Fetching real market data from Barchart API...');
      
      const marketPrices = await barchartService.getCoffeePrices();
      
      console.log('Updated prices from Barchart API:', marketPrices);
      setPrices(marketPrices);
      
    } catch (error) {
      console.error('Error fetching from Barchart API:', error);
      // Fall back to default values on error
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

  const refreshPrices = async () => {
    await fetchFromBarchartAPI();
  };

  // Load prices on component mount and set up periodic refresh
  useEffect(() => {
    refreshPrices();
    
    // Refresh prices every 5 minutes to simulate real-time market data
    const interval = setInterval(refreshPrices, 5 * 60 * 1000);
    
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
