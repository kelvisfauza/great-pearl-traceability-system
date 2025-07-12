
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
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase orders:', error);
        setPurchaseOrders([]);
        return;
      }

      const transformedOrders: PurchaseOrder[] = data.map(order => ({
        id: order.id,
        supplier: order.supplier_name,
        coffeeType: order.coffee_type,
        quantity: order.quantity,
        unitPrice: order.unit_price,
        totalAmount: order.total_amount,
        status: order.status,
        deliveryDate: order.delivery_date,
        received: order.received || 0
      }));

      setPurchaseOrders(transformedOrders);
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
