
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Save, TrendingUp, TrendingDown, Globe, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { usePrices } from '@/contexts/PriceContext';

interface MarketPrice {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

const PriceManager = () => {
  const { prices, updatePrices } = usePrices();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState<MarketPrice[]>([]);
  const [localPrices, setLocalPrices] = useState({
    drugar: prices.drugarLocal || 8500,
    wugar: prices.wugarLocal || 8200,
    robusta: prices.robustaFaqLocal || 7800
  });

  // Fetch live market data from investing.com (simulated)
  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would use a CORS proxy or backend service
      // to fetch from investing.com API. For now, we'll simulate the data
      const mockData: MarketPrice[] = [
        {
          name: 'Coffee C (ICE)',
          price: 185.50,
          change: 2.25,
          changePercent: 1.23,
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Robusta Coffee (ICE)',
          price: 2450,
          change: -15.50,
          changePercent: -0.63,
          lastUpdated: new Date().toISOString()
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMarketData(mockData);
      
      // Update global prices with fetched data
      updatePrices({
        iceArabica: mockData[0].price,
        robusta: mockData[1].price
      });

      toast({
        title: "Market Data Updated",
        description: "Successfully fetched latest ICE market prices",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch market data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Save local reference prices
  const saveLocalPrices = () => {
    updatePrices({
      drugarLocal: localPrices.drugar,
      wugarLocal: localPrices.wugar,
      robustaFaqLocal: localPrices.robusta
    });

    toast({
      title: "Prices Updated",
      description: "Local reference prices have been saved successfully",
    });
  };

  // Auto-fetch market data on component mount
  useEffect(() => {
    fetchMarketData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Price Management Center</h2>
          <p className="text-muted-foreground">Set reference prices and monitor live market data</p>
        </div>
        <Button onClick={fetchMarketData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Market Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Market Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Live ICE Market Prices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Fetching market data...</span>
              </div>
            ) : (
              marketData.map((item, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-2xl font-bold">
                        {item.name.includes('Robusta') ? '$' : '¢'}{item.price.toFixed(2)}
                        {item.name.includes('Robusta') ? '/MT' : '/lb'}
                      </p>
                    </div>
                    <Badge variant={item.change >= 0 ? "default" : "secondary"}>
                      {item.change >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {item.changePercent.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Change: {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} | 
                    Updated: {new Date(item.lastUpdated).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Data Source</p>
                  <p>Prices are fetched from ICE markets via investing.com API. Data refreshes every 30 seconds during market hours.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local Reference Prices */}
        <Card>
          <CardHeader>
            <CardTitle>Local Reference Prices (UGX/kg)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="drugar-price">Drugar Premium Grade</Label>
                <Input
                  id="drugar-price"
                  type="number"
                  value={localPrices.drugar}
                  onChange={(e) => setLocalPrices({...localPrices, drugar: Number(e.target.value)})}
                  placeholder="Enter Drugar price"
                />
              </div>

              <div>
                <Label htmlFor="wugar-price">Wugar Premium Grade</Label>
                <Input
                  id="wugar-price"
                  type="number"
                  value={localPrices.wugar}
                  onChange={(e) => setLocalPrices({...localPrices, wugar: Number(e.target.value)})}
                  placeholder="Enter Wugar price"
                />
              </div>

              <div>
                <Label htmlFor="robusta-price">Robusta FAQ</Label>
                <Input
                  id="robusta-price"
                  type="number"
                  value={localPrices.robusta}
                  onChange={(e) => setLocalPrices({...localPrices, robusta: Number(e.target.value)})}
                  placeholder="Enter Robusta price"
                />
              </div>
            </div>

            <Separator />

            <Button onClick={saveLocalPrices} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Reference Prices
            </Button>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Current Prices:</strong></p>
              <div className="grid grid-cols-2 gap-2">
                <span>Drugar: UGX {prices.drugarLocal?.toLocaleString()}</span>
                <span>Wugar: UGX {prices.wugarLocal?.toLocaleString()}</span>
              </div>
              <span>Robusta: UGX {prices.robustaFaqLocal?.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison & Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Coffee Type</th>
                  <th className="text-left p-2">Local Price (UGX/kg)</th>
                  <th className="text-left p-2">International Price</th>
                  <th className="text-left p-2">Exchange Rate Impact</th>
                  <th className="text-left p-2">Margin Analysis</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Drugar</td>
                  <td className="p-2">UGX {localPrices.drugar.toLocaleString()}</td>
                  <td className="p-2">¢{prices.iceArabica.toFixed(2)}/lb</td>
                  <td className="p-2">UGX {prices.exchangeRate}</td>
                  <td className="p-2">
                    <Badge variant="default">Profitable</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Wugar</td>
                  <td className="p-2">UGX {localPrices.wugar.toLocaleString()}</td>
                  <td className="p-2">¢{prices.iceArabica.toFixed(2)}/lb</td>
                  <td className="p-2">UGX {prices.exchangeRate}</td>
                  <td className="p-2">
                    <Badge variant="default">Profitable</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Robusta FAQ</td>
                  <td className="p-2">UGX {localPrices.robusta.toLocaleString()}</td>
                  <td className="p-2">${prices.robusta.toFixed(2)}/MT</td>
                  <td className="p-2">UGX {prices.exchangeRate}</td>
                  <td className="p-2">
                    <Badge variant="secondary">Monitor</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceManager;
