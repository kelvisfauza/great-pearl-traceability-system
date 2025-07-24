
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, RefreshCw, Globe, AlertTriangle, Clock, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMarketData } from '@/hooks/useMarketData';
import { usePrices } from '@/contexts/PriceContext';
import ReferencePriceInput from './ReferencePriceInput';

const MarketMonitor = () => {
  const { marketData, priceHistory, loading } = useMarketData();
  const { prices, refreshPrices } = usePrices();

  const marketMetrics = [
    {
      name: 'ICE Arabica C',
      price: prices.iceArabica || 185.50,
      unit: '¢/lb',
      change: 2.5,
      trend: 'up',
      volume: '15,342 lots',
      support: '180.00',
      resistance: '195.00'
    },
    {
      name: 'Robusta',
      price: prices.robusta || 2450,
      unit: '$/MT',
      change: -1.2,
      trend: 'down',
      volume: '8,221 lots',
      support: '2,400',
      resistance: '2,600'
    },
    {
      name: 'USD/UGX',
      price: prices.exchangeRate || 3750,
      unit: 'UGX',
      change: 0.3,
      trend: 'up',
      volume: 'High',
      support: '3,680',
      resistance: '3,780'
    }
  ];

  const localPrices = [
    {
      grade: 'Drugar',
      farmGate: 8200,
      processing: 8500,
      export: 9200,
      trend: 'up',
      availability: 'High'
    },
    {
      grade: 'Wugar',
      farmGate: 7800,
      processing: 8200,
      export: 8800,
      trend: 'stable',
      availability: 'Medium'
    },
    {
      grade: 'Robusta FAQ',
      farmGate: 7200,
      processing: 7800,
      export: 8200,
      trend: 'up',
      availability: 'High'
    }
  ];

  const alerts = [
    {
      type: 'warning',
      message: 'Arabica prices approaching resistance level',
      time: '2 min ago'
    },
    {
      type: 'info',
      message: 'UGX strengthening against USD',
      time: '15 min ago'
    },
    {
      type: 'urgent',
      message: 'High volatility detected in Robusta futures',
      time: '32 min ago'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reference Price Monitor</h2>
          <p className="text-muted-foreground">Manage and monitor coffee reference prices</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshPrices}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Price Overview</TabsTrigger>
          <TabsTrigger value="input">Set Prices</TabsTrigger>
          <TabsTrigger value="charts">Price Charts</TabsTrigger>
          <TabsTrigger value="local">Local Markets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                    <Badge variant="outline">
                      <Settings className="h-3 w-3 mr-1" />
                      Reference
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold">
                    {(metric.price || 0).toLocaleString()} {metric.unit}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Current reference price for {metric.name.toLowerCase()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="input" className="space-y-4">
          <ReferencePriceInput />
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trends (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="arabica" stroke="#8884d8" name="Arabica (¢/lb)" />
                  <Line type="monotone" dataKey="drugar" stroke="#82ca9d" name="Drugar (UGX/kg)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {localPrices.map((price, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{price.grade}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={price.availability === 'High' ? 'default' : 'secondary'}>
                        {price.availability} Supply
                      </Badge>
                      <Badge variant={price.trend === 'up' ? 'default' : 'outline'}>
                        {price.trend === 'up' ? '↗' : price.trend === 'down' ? '↘' : '→'} {price.trend}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Farm Gate</div>
                      <div className="text-lg font-bold">UGX {price.farmGate.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Processing</div>
                      <div className="text-lg font-bold">UGX {price.processing.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Export FOB</div>
                      <div className="text-lg font-bold text-green-600">UGX {price.export.toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketMonitor;
