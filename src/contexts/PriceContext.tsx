
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
      console.log('Refreshing prices from Supabase price_data table...');
      
      // Fetch latest price data from Supabase
      const { data: priceData, error } = await supabase
        .from('price_data')
        .select('*')
        .order('recorded_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching prices:', error);
        return;
      }
      
      console.log('Latest price data from Supabase:', priceData);
      
      if (priceData && priceData.length > 0) {
        const latestPrices: Partial<PriceData> = {};
        
        // Get the most recent price for each type
        const priceMap = new Map();
        priceData.forEach((price: any) => {
          if (!priceMap.has(price.price_type)) {
            priceMap.set(price.price_type, price.price_value);
          }
        });
        
        // Map the price types to our interface
        latestPrices.iceArabica = priceMap.get('ice_arabica') || 185.50;
        latestPrices.robusta = priceMap.get('ice_robusta') || 2450;
        latestPrices.drugarLocal = priceMap.get('drugar_local') || 8500;
        latestPrices.wugarLocal = priceMap.get('wugar_local') || 8200;
        latestPrices.robustaFaqLocal = priceMap.get('robusta_faq_local') || 7800;
        latestPrices.exchangeRate = priceMap.get('exchange_rate') || 3750;
        
        console.log('Updated prices from data analyst manual input:', latestPrices);
        setPrices(prev => ({ ...prev, ...latestPrices }));
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load prices on component mount and set up periodic refresh
  useEffect(() => {
    refreshPrices();
    
    // Refresh prices every 30 seconds to get latest manual inputs
    const interval = setInterval(refreshPrices, 30 * 1000);
    
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
