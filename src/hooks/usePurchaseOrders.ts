
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseOrder {
  id: string;
  supplier: string;
  coffeeType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  deliveryDate: string;
  received: number;
}

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      // For now, we'll return empty array since purchase_orders table doesn't exist yet
      // This prevents errors while maintaining the interface
      setPurchaseOrders([]);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return {
    purchaseOrders,
    loading,
    fetchPurchaseOrders
  };
};
