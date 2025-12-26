import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingUp, Warehouse, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface StoreStats {
  todayPurchases: number;
  todayKilograms: number;
  totalStoreStock: number;
  newReceiptsCount: number;
}

const StoreRealTimeTracker = () => {
  const [stats, setStats] = useState<StoreStats>({
    todayPurchases: 0,
    todayKilograms: 0,
    totalStoreStock: 0,
    newReceiptsCount: 0,
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);

  const fetchStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [todayRecords, allRecords] = await Promise.all([
      // Today's purchases
      supabase
        .from('coffee_records')
        .select('kilograms, bags')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`),
      // All pending/available stock
      supabase
        .from('coffee_records')
        .select('kilograms')
        .in('status', ['pending', 'quality_review', 'pricing', 'inventory']),
    ]);

    const todayKg = todayRecords.data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;
    const todayCount = todayRecords.data?.length || 0;
    const totalStock = allRecords.data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;

    setStats({
      todayPurchases: todayCount,
      todayKilograms: Math.round(todayKg),
      totalStoreStock: Math.round(totalStock),
      newReceiptsCount: todayCount,
    });
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscription
    const channel = supabase
      .channel('store-realtime-tracker')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coffee_records'
        },
        () => {
          fetchStats();
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statCards = [
    {
      label: "Today's Purchases",
      value: stats.todayPurchases,
      subtitle: "receipts received",
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Today's Volume",
      value: `${stats.todayKilograms.toLocaleString()} kg`,
      subtitle: "coffee purchased",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Store Stock",
      value: `${stats.totalStoreStock.toLocaleString()} kg`,
      subtitle: "available for processing",
      icon: Warehouse,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLive ? 'text-green-500 animate-spin' : 'text-muted-foreground'}`} style={{ animationDuration: '3s' }} />
            Store Real-Time Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
              {isLive ? "● LIVE" : "Connecting..."}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Updated {format(lastUpdate, 'HH:mm:ss')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`p-4 rounded-lg ${stat.bgColor} border border-border/50`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-background`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Use this data to plan contracts and deliveries • Auto-refreshes on new purchases
        </p>
      </CardContent>
    </Card>
  );
};

export default StoreRealTimeTracker;
