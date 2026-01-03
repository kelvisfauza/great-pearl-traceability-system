import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingUp, Warehouse, RefreshCw, History, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, addDays, isToday } from "date-fns";

interface DayStats {
  date: Date;
  purchases: number;
  kilograms: number;
  receipts: number;
  robustaKg: number;
  arabicaKg: number;
}

interface StoreStats {
  todayPurchases: number;
  todayKilograms: number;
  totalStoreStock: number;
  newReceiptsCount: number;
  robustaKg: number;
  arabicaKg: number;
  totalRobusta: number;
  totalArabica: number;
}

const StoreRealTimeTracker = () => {
  const [stats, setStats] = useState<StoreStats>({
    todayPurchases: 0,
    todayKilograms: 0,
    totalStoreStock: 0,
    newReceiptsCount: 0,
    robustaKg: 0,
    arabicaKg: 0,
    totalRobusta: 0,
    totalArabica: 0,
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<DayStats[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loadingHistory, setLoadingHistory] = useState(false);

  const isRobusta = (coffeeType: string) => 
    coffeeType?.toLowerCase().includes('robusta');
  
  const isArabica = (coffeeType: string) => 
    coffeeType?.toLowerCase().includes('arabica');

  const fetchStats = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [todayRecords, allRecords] = await Promise.all([
      // Today's purchases - filter by date field which stores the purchase date
      supabase
        .from('coffee_records')
        .select('kilograms, bags, coffee_type')
        .eq('date', today),
      // All pending/available stock
      supabase
        .from('coffee_records')
        .select('kilograms, coffee_type')
        .in('status', ['pending', 'quality_review', 'pricing', 'inventory']),
    ]);

    const todayKg = todayRecords.data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;
    const todayCount = todayRecords.data?.length || 0;
    const totalStock = allRecords.data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;

    // Calculate Robusta and Arabica for today
    const todayRobusta = todayRecords.data?.reduce((sum, r) => 
      isRobusta(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;
    const todayArabica = todayRecords.data?.reduce((sum, r) => 
      isArabica(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;

    // Calculate total Robusta and Arabica in stock
    const totalRobusta = allRecords.data?.reduce((sum, r) => 
      isRobusta(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;
    const totalArabica = allRecords.data?.reduce((sum, r) => 
      isArabica(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;

    setStats({
      todayPurchases: todayCount,
      todayKilograms: Math.round(todayKg),
      totalStoreStock: Math.round(totalStock),
      newReceiptsCount: todayCount,
      robustaKg: Math.round(todayRobusta),
      arabicaKg: Math.round(todayArabica),
      totalRobusta: Math.round(totalRobusta),
      totalArabica: Math.round(totalArabica),
    });
    setLastUpdate(new Date());
  };

  const fetchHistoryForDate = async (date: Date) => {
    setLoadingHistory(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('coffee_records')
      .select('kilograms, bags, coffee_type')
      .eq('date', dateStr);

    const kg = data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;
    const count = data?.length || 0;
    const robustaKg = data?.reduce((sum, r) => 
      isRobusta(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;
    const arabicaKg = data?.reduce((sum, r) => 
      isArabica(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;

    setHistoryData([{
      date,
      purchases: count,
      kilograms: Math.round(kg),
      receipts: count,
      robustaKg: Math.round(robustaKg),
      arabicaKg: Math.round(arabicaKg),
    }]);
    setLoadingHistory(false);
  };

  const fetchWeekHistory = async () => {
    setLoadingHistory(true);
    const days: DayStats[] = [];
    
    // Fetch last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('coffee_records')
        .select('kilograms, bags, coffee_type')
        .eq('date', dateStr);

      const kg = data?.reduce((sum, r) => sum + (r.kilograms || 0), 0) || 0;
      const count = data?.length || 0;
      const robustaKg = data?.reduce((sum, r) => 
        isRobusta(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;
      const arabicaKg = data?.reduce((sum, r) => 
        isArabica(r.coffee_type) ? sum + (r.kilograms || 0) : sum, 0) || 0;

      days.push({
        date,
        purchases: count,
        kilograms: Math.round(kg),
        receipts: count,
        robustaKg: Math.round(robustaKg),
        arabicaKg: Math.round(arabicaKg),
      });
    }
    
    setHistoryData(days);
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchStats();

    // Auto-refresh every minute
    const refreshInterval = setInterval(() => {
      fetchStats();
    }, 60000);

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
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchWeekHistory();
    }
  }, [showHistory]);

  const handlePrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
    fetchHistoryForDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      fetchHistoryForDate(newDate);
    }
  };

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
      subtitle: `Robusta: ${stats.robustaKg.toLocaleString()} kg • Arabica: ${stats.arabicaKg.toLocaleString()} kg`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Store Stock",
      value: `${stats.totalStoreStock.toLocaleString()} kg`,
      subtitle: `Robusta: ${stats.totalRobusta.toLocaleString()} kg • Arabica: ${stats.totalArabica.toLocaleString()} kg`,
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
            <Button
              variant={showHistory ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-7 text-xs"
            >
              <History className="h-3 w-3 mr-1" />
              {showHistory ? "Live View" : "History"}
            </Button>
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
        {!showHistory ? (
          <>
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
              Showing today's ({format(new Date(), 'MMM dd, yyyy')}) data • Auto-refreshes on new purchases
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {/* Date Navigator */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <Button variant="ghost" size="sm" onClick={handlePrevDay}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">{format(selectedDate, 'EEEE, MMM dd, yyyy')}</p>
                {isToday(selectedDate) && (
                  <Badge variant="default" className="text-xs mt-1">Today</Badge>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNextDay}
                disabled={isToday(selectedDate)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Weekly Summary Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-center p-3 font-medium">Receipts</th>
                        <th className="text-right p-3 font-medium">Robusta</th>
                        <th className="text-right p-3 font-medium">Arabica</th>
                        <th className="text-right p-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((day, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-t hover:bg-muted/30 cursor-pointer ${
                            format(day.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') 
                              ? 'bg-primary/10' 
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedDate(day.date);
                            fetchHistoryForDate(day.date);
                          }}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{format(day.date, 'EEE')}</span>
                              <span className="text-muted-foreground">{format(day.date, 'MMM dd')}</span>
                              {isToday(day.date) && (
                                <Badge variant="outline" className="text-xs">Today</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={day.receipts > 0 ? "default" : "secondary"}>
                              {day.receipts}
                            </Badge>
                          </td>
                          <td className="p-3 text-right text-amber-600 font-medium">
                            {day.robustaKg.toLocaleString()} kg
                          </td>
                          <td className="p-3 text-right text-emerald-600 font-medium">
                            {day.arabicaKg.toLocaleString()} kg
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {day.kilograms.toLocaleString()} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2">
                      <tr>
                        <td className="p-3 font-semibold">Week Total</td>
                        <td className="p-3 text-center font-semibold">
                          {historyData.reduce((sum, d) => sum + d.receipts, 0)}
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600">
                          {historyData.reduce((sum, d) => sum + d.robustaKg, 0).toLocaleString()} kg
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          {historyData.reduce((sum, d) => sum + d.arabicaKg, 0).toLocaleString()} kg
                        </td>
                        <td className="p-3 text-right font-bold text-primary">
                          {historyData.reduce((sum, d) => sum + d.kilograms, 0).toLocaleString()} kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreRealTimeTracker;
