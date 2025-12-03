import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { Loader2 } from 'lucide-react';

const PriceTrendsChart: React.FC = () => {
  const { history, loading } = usePriceHistory(30);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const chartData = history.map(record => ({
    date: formatDate(record.price_date),
    fullDate: record.price_date,
    arabicaPrice: record.arabica_buying_price,
    robustaPrice: record.robusta_buying_price,
    drugar: record.drugar_local,
    wugar: record.wugar_local,
    robustaFaq: record.robusta_faq_local,
    iceArabica: record.ice_arabica,
    iceRobusta: record.robusta_international,
    exchangeRate: record.exchange_rate
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No price history available. Save prices to start tracking trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Trends (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buying" className="space-y-4">
          <TabsList>
            <TabsTrigger value="buying">Buying Prices</TabsTrigger>
            <TabsTrigger value="local">Local Markets</TabsTrigger>
            <TabsTrigger value="international">ICE Markets</TabsTrigger>
          </TabsList>

          <TabsContent value="buying" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`UGX ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="arabicaPrice" 
                  name="Arabica" 
                  stroke="#d97706" 
                  strokeWidth={2}
                  dot={{ fill: '#d97706', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="robustaPrice" 
                  name="Robusta" 
                  stroke="#059669" 
                  strokeWidth={2}
                  dot={{ fill: '#059669', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="local" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`UGX ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="drugar" 
                  name="Drugar" 
                  stroke="#7c3aed" 
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="wugar" 
                  name="Wugar" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="robustaFaq" 
                  name="Robusta FAQ" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="international" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="iceArabica" 
                  name="ICE Arabica (¢/lb)" 
                  stroke="#d97706" 
                  strokeWidth={2}
                  dot={{ fill: '#d97706', r: 3 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="iceRobusta" 
                  name="ICE Robusta ($/MT)" 
                  stroke="#059669" 
                  strokeWidth={2}
                  dot={{ fill: '#059669', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PriceTrendsChart;
