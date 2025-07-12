
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DollarSign, LineChart as LineChartIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';

const MarketMonitor = () => {
  const { marketData, setMarketData, priceHistory, convertCentsLbToUGXKg } = useMarketData();

  const chartConfig = {
    arabica: {
      label: "Arabica (¢/lb)",
      color: "hsl(var(--chart-1))",
    },
    drugar: {
      label: "Drugar (UGX)",
      color: "hsl(var(--chart-2))",
    },
  };

  const exportMarketData = [
    { 
      name: "ICE NY Arabica", 
      value: `${marketData.iceArabica.toFixed(2)}¢`, 
      change: "+2.3%", 
      trend: "up",
      icon: TrendingUp,
      color: "text-green-600"
    },
    { 
      name: "ICE London Robusta", 
      value: `$${marketData.robusta.toLocaleString()}`, 
      change: "-1.2%", 
      trend: "down",
      icon: TrendingDown,
      color: "text-red-600"
    },
    { 
      name: "Uganda Export Premium", 
      value: "+12¢", 
      change: "Above NY", 
      trend: "neutral",
      icon: DollarSign,
      color: "text-blue-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Market Prices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ice-arabica">ICE Arabica (¢/lb)</Label>
                <Input
                  id="ice-arabica"
                  type="number"
                  value={marketData.iceArabica.toFixed(2)}
                  onChange={(e) => setMarketData(prev => ({ ...prev, iceArabica: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ UGX {convertCentsLbToUGXKg(marketData.iceArabica).toLocaleString()}/kg
                </p>
              </div>
              <div>
                <Label htmlFor="robusta">Robusta (USD/ton)</Label>
                <Input
                  id="robusta"
                  type="number"
                  value={marketData.robusta}
                  onChange={(e) => setMarketData(prev => ({ ...prev, robusta: Number(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ UGX {Math.round(marketData.robusta * marketData.exchangeRate / 1000).toLocaleString()}/kg
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>UCDA Local Prices (UGX/kg)</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    placeholder="Drugar"
                    value={marketData.ucdaDrugar}
                    onChange={(e) => setMarketData(prev => ({ ...prev, ucdaDrugar: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-center mt-1">Drugar</p>
                </div>
                <div>
                  <Input
                    placeholder="Wugar"
                    value={marketData.ucdaWugar}
                    onChange={(e) => setMarketData(prev => ({ ...prev, ucdaWugar: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-center mt-1">Wugar</p>
                </div>
                <div>
                  <Input
                    placeholder="Robusta FAQ"
                    value={marketData.ucdaRobusta}
                    onChange={(e) => setMarketData(prev => ({ ...prev, ucdaRobusta: Number(e.target.value) }))}
                  />
                  <p className="text-xs text-center mt-1">Robusta</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="exchange-rate">Exchange Rate (UGX/USD)</Label>
              <Input
                id="exchange-rate"
                type="number"
                value={marketData.exchangeRate}
                onChange={(e) => setMarketData(prev => ({ ...prev, exchangeRate: Number(e.target.value) }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              Price Trends (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="arabica" stroke="var(--color-arabica)" name="Arabica (¢/lb)" />
                <Line type="monotone" dataKey="drugar" stroke="var(--color-drugar)" name="Drugar (UGX)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Market Watch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Export Market Watch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exportMarketData.map((market, index) => {
              const IconComponent = market.icon;
              return (
                <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{market.name}</h4>
                    <IconComponent className={`h-4 w-4 ${market.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${market.color}`}>{market.value}</p>
                  <p className="text-sm text-muted-foreground">{market.change}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketMonitor;
