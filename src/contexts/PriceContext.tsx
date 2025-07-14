
import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  const refreshPrices = async () => {
    try {
      console.log('Refreshing prices from Firebase...');
      
      // Fetch latest price data from Firebase
      const priceQuery = query(
        collection(db, 'price_data'), 
        orderBy('recorded_at', 'desc'), 
        limit(10)
      );
      const priceSnapshot = await getDocs(priceQuery);
      const priceData = priceSnapshot.docs.map(doc => doc.data());
      
      console.log('Latest price data:', priceData);
      
      if (priceData.length > 0) {
        const latestPrices: Partial<PriceData> = {};
        
        priceData.forEach((price: any) => {
          switch (price.price_type) {
            case 'ice_arabica':
              latestPrices.iceArabica = price.price_value;
              break;
            case 'ice_robusta':
              latestPrices.robusta = price.price_value;
              break;
            case 'drugar_local':
              latestPrices.drugarLocal = price.price_value;
              break;
            case 'wugar_local':
              latestPrices.wugarLocal = price.price_value;
              break;
            case 'robusta_faq_local':
              latestPrices.robustaFaqLocal = price.price_value;
              break;
            case 'exchange_rate':
              latestPrices.exchangeRate = price.price_value;
              break;
          }
        });
        
        console.log('Updated prices:', latestPrices);
        setPrices(prev => ({ ...prev, ...latestPrices }));
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
    }
  };

  // Load prices on component mount and set up periodic refresh
  useEffect(() => {
    refreshPrices();
    
    // Refresh prices every 5 minutes
    const interval = setInterval(refreshPrices, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const updatePrices = (newPrices: Partial<PriceData>) => {
    console.log('Updating prices locally:', newPrices);
    setPrices(prev => ({ ...prev, ...newPrices }));
  };

  return (
    <PriceContext.Provider value={{ prices, updatePrices, refreshPrices }}>
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
