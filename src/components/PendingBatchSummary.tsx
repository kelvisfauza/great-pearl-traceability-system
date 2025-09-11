import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Package, Scale, User } from 'lucide-react';

interface PendingDelivery {
  id: string;
  supplier_name: string;
  quantity_kg: number;
  quantity_bags: number;
  transaction_date: string;
  created_by: string;
}

interface PendingBatchSummaryProps {
  refreshTrigger?: number;
}

export const PendingBatchSummary: React.FC<PendingBatchSummaryProps> = ({ refreshTrigger = 0 }) => {
  const [pendingDeliveries, setPendingDeliveries] = useState<PendingDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingDeliveries();
  }, [refreshTrigger]);

  const fetchPendingDeliveries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('store_records')
        .select('*')
        .eq('status', 'pending_batch')
        .eq('transaction_type', 'received')
        .order('supplier_name', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching pending deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group deliveries by supplier
  const groupedDeliveries = pendingDeliveries.reduce((acc, delivery) => {
    const supplier = delivery.supplier_name;
    if (!acc[supplier]) {
      acc[supplier] = {
        deliveries: [],
        totalWeight: 0,
        totalBags: 0
      };
    }
    acc[supplier].deliveries.push(delivery);
    acc[supplier].totalWeight += delivery.quantity_kg;
    acc[supplier].totalBags += delivery.quantity_bags;
    return acc;
  }, {} as Record<string, { deliveries: PendingDelivery[], totalWeight: number, totalBags: number }>);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (Object.keys(groupedDeliveries).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending deliveries waiting to be batched.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pending Batches
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deliveries waiting to reach 1,000kg minimum batch weight
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedDeliveries).map(([supplier, info]) => (
            <div key={supplier} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{supplier}</h4>
                <Badge variant={info.totalWeight >= 1000 ? "default" : "secondary"}>
                  {info.totalWeight >= 1000 ? 'Ready for batch' : 'Accumulating'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-6 mb-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Scale className="h-4 w-4" />
                  {info.totalWeight.toFixed(1)}kg / 1,000kg
                </div>
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {info.totalBags} bags total
                </div>
              </div>

              <div className="space-y-2">
                {info.deliveries.map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                    <div className="flex items-center gap-4">
                      <span>{delivery.quantity_kg}kg</span>
                      <span className="text-muted-foreground">•</span>
                      <span>{delivery.transaction_date}</span>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {delivery.created_by}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {info.totalWeight < 1000 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Needs {(1000 - info.totalWeight).toFixed(1)}kg more to create batch
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};