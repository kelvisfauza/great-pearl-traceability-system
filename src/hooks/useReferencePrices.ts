import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  lastUpdated?: string;
}

export const useReferencePrices = () => {
  const [prices, setPrices] = useState<ReferencePrices>({
    iceArabica: 185.50,
    robusta: 2450,
    exchangeRate: 3750,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800
  });
  const [loading, setLoading] = useState(false);

  // Fetch reference prices from Firebase
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'market_prices', 'reference_prices');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrices({
          iceArabica: data.iceArabica || 185.50,
          robusta: data.robusta || 2450,
          exchangeRate: data.exchangeRate || 3750,
          drugarLocal: data.drugarLocal || 8500,
          wugarLocal: data.wugarLocal || 8200,
          robustaFaqLocal: data.robustaFaqLocal || 7800,
          lastUpdated: data.updatedAt
        });
      }
    } catch (error) {
      console.error('Error fetching reference prices:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save reference prices to Firebase
  const savePrices = async (newPrices: Omit<ReferencePrices, 'lastUpdated'>) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'market_prices', 'reference_prices');
      
      const priceData = {
        ...newPrices,
        lastUpdated: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, priceData);
      
      // Update local state
      setPrices({
        ...newPrices,
        lastUpdated: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Error saving reference prices:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    const docRef = doc(db, 'market_prices', 'reference_prices');
    
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPrices({
          iceArabica: data.iceArabica || 185.50,
          robusta: data.robusta || 2450,
          exchangeRate: data.exchangeRate || 3750,
          drugarLocal: data.drugarLocal || 8500,
          wugarLocal: data.wugarLocal || 8200,
          robustaFaqLocal: data.robustaFaqLocal || 7800,
          lastUpdated: data.updatedAt
        });
      }
    }, (error) => {
      console.error('Error listening to price updates:', error);
    });

    // Initial fetch
    fetchPrices();

    return () => unsubscribe();
  }, [fetchPrices]);

  return {
    prices,
    loading,
    savePrices,
    fetchPrices
  };
};