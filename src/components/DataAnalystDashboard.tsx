
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, 
  Calculator, Download, FileText, Globe, Calendar,
  Target, Shield, BarChart3, LineChart as LineChartIcon
} from 'lucide-react';

const DataAnalystDashboard = () => {
  // Market Data State
  const [marketData, setMarketData] = useState({
    iceArabica: 155.50, // USD cents/lb
    robusta: 2450, // USD/ton
    ucdaDrugar: 8500, // UGX/kg
    ucdaWugar: 7800, // UGX/kg
    ucdaRobusta: 6200, // UGX/kg
    exchangeRate: 3750 // UGX per USD
  });

  // Procurement Advisory State
  const [procurementData, setProcurementData] = useState({
    targetMargin: 15, // %
    productionCost: 5500, // UGX/kg
    maxBuyPrice: {
      drugar: 7000,
      wugar: 6500,
      robusta: 5200
    }
  });

  // Outturn Simulator State
  const [outturnData, setOutturnData] = useState({
    outturnPercentage: 78,
    group1Defects: 2.5,
    group2Defects: 1.8,
    moisturePercent: 12.5,
    referencePrice: 8500,
    calculatedPrice: 0,
    riskLevel: 'medium'
  });

  // Sample price history data
  const priceHistory = [
    { date: '2025-01-01', arabica: 150, robusta: 2400, drugar: 8200 },
    { date: '2025-01-02', arabica: 152, robusta: 2420, drugar: 8300 },
    { date: '2025-01-03', arabica: 155, robusta: 2450, drugar: 8500 },
    { date: '2025-01-04', arabica: 154, robusta: 2430, drugar: 8400 },
    { date: '2025-01-05', arabica: 156, robusta: 2470, drugar: 8600 },
    { date: '2025-01-06', arabica: 153, robusta: 2440, drugar: 8350 },
    { date: '2025-01-07', arabica: 157, robusta: 2480, drugar: 8700 }
  ];

  // Contract history data
  const contractHistory = [
    { date: '2024-12-15', type: 'Drugar', quantity: 500, price: 8200, rate: 3720 },
    { date: '2024-12-10', type: 'Wugar', quantity: 300, price: 7500, rate: 3715 },
    { date: '2024-12-05', type: 'Robusta', quantity: 800, price: 6000, rate: 3710 },
    { date: '2024-11-28', type: 'Drugar', quantity: 600, price: 8100, rate: 3705 }
  ];

  // Calculate outturn-based pricing
  useEffect(() => {
    const { outturnPercentage, group1Defects, group2Defects, moisturePercent, referencePrice } = outturnData;
    
    // Outturn adjustment
    const outturnAdjustment = outturnPercentage / 100;
    
    // Defect deductions (Group 1 defects deduct more)
    const defectDeduction = (group1Defects * 0.8) + (group2Defects * 0.5);
    
    // Moisture adjustment (12% is standard)
    const moistureAdjustment = moisturePercent > 12 ? (moisturePercent - 12) * 0.02 : 0;
    
    // Calculate safe buying price
    const adjustedPrice = referencePrice * outturnAdjustment * (1 - defectDeduction/100) * (1 - moistureAdjustment);
    
    // Determine risk level
    let riskLevel = 'low';
    if (outturnPercentage < 75 || group1Defects > 3 || moisturePercent > 13) {
      riskLevel = 'high';
    } else if (outturnPercentage < 80 || group1Defects > 2 || moisturePercent > 12.5) {
      riskLevel = 'medium';
    }
    
    setOutturnData(prev => ({
      ...prev,
      calculatedPrice: Math.round(adjustedPrice),
      riskLevel
    }));
  }, [outturnData.outturnPercentage, outturnData.group1Defects, outturnData.group2Defects, outturnData.moisturePercent, outturnData.referencePrice]);

  // Risk alerts
  const riskAlerts = [
    { type: 'price', message: 'Arabica prices dropped 3% in last 24 hours', severity: 'warning' },
    { type: 'exchange', message: 'UGX weakened by 0.5% against USD', severity: 'info' },
    { type: 'procurement', message: 'Supplier offer exceeds safe buying range', severity: 'danger' }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const convertUSDToUGX = (usdPrice: number) => Math.round(usdPrice * marketData.exchangeRate);
  const convertCentsLbToUGXKg = (centsPerLb: number) => Math.round((centsPerLb / 100) * 2.20462 * marketData.exchangeRate);

  return (
    <div className="space-y-6">
      {/* Header with Risk Alerts */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Data Analyst Dashboard</h1>
          <p className="text-muted-foreground">Market analysis, pricing advisory, and risk management</p>
        </div>
        <div className="space-y-2">
          {riskAlerts.map((alert, index) => (
            <Alert key={index} className={`w-80 ${alert.severity === 'danger' ? 'border-red-500' : alert.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'}`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      </div>

      <Tabs defaultValue="market-monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="market-monitoring">Market Monitor</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="outturn">Outturn Simulator</TabsTrigger>
          <TabsTrigger value="forecasting">Sales Forecast</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Market Monitoring Tab */}
        <TabsContent value="market-monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Prices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Current Market Prices
                </CardTitle>
                <CardDescription>Live market data with auto-conversion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ice-arabica">ICE Arabica (¢/lb)</Label>
                    <Input
                      id="ice-arabica"
                      type="number"
                      value={marketData.iceArabica}
                      onChange={(e) => setMarketData(prev => ({ ...prev, iceArabica: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ UGX {convertCentsLbToUGXKg(marketData.iceArabica)}/kg
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
                      ≈ UGX {Math.round(marketData.robusta * marketData.exchangeRate / 1000)}/kg
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
                      <p className="text-xs text-center">Drugar</p>
                    </div>
                    <div>
                      <Input
                        placeholder="Wugar"
                        value={marketData.ucdaWugar}
                        onChange={(e) => setMarketData(prev => ({ ...prev, ucdaWugar: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-center">Wugar</p>
                    </div>
                    <div>
                      <Input
                        placeholder="Robusta FAQ"
                        value={marketData.ucdaRobusta}
                        onChange={(e) => setMarketData(prev => ({ ...prev, ucdaRobusta: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-center">Robusta</p>
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={priceHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="arabica" stroke="#8884d8" name="Arabica (¢/lb)" />
                    <Line type="monotone" dataKey="drugar" stroke="#82ca9d" name="Drugar (UGX)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Export Market Watch */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Export Market Watch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">ICE NY Arabica</h4>
                  <p className="text-2xl font-bold text-green-600">155.50¢</p>
                  <p className="text-sm text-muted-foreground">+2.3% today</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">ICE London Robusta</h4>
                  <p className="text-2xl font-bold text-red-600">$2,450</p>
                  <p className="text-sm text-muted-foreground">-1.2% today</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Uganda Export Premium</h4>
                  <p className="text-2xl font-bold">+12¢</p>
                  <p className="text-sm text-muted-foreground">Above NY</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procurement Advisory Tab */}
        <TabsContent value="procurement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Procurement Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="target-margin">Target Profit Margin (%)</Label>
                  <Input
                    id="target-margin"
                    type="number"
                    value={procurementData.targetMargin}
                    onChange={(e) => setProcurementData(prev => ({ ...prev, targetMargin: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="production-cost">Average Production Cost (UGX/kg)</Label>
                  <Input
                    id="production-cost"
                    type="number"
                    value={procurementData.productionCost}
                    onChange={(e) => setProcurementData(prev => ({ ...prev, productionCost: Number(e.target.value) }))}
                  />
                </div>
                <Button className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Recommended Prices
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Buying Prices</CardTitle>
                <CardDescription>Based on current market and target margins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Drugar FAQ</p>
                      <p className="text-sm text-muted-foreground">Max safe buying price</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">UGX 7,000</p>
                      <Badge variant="outline" className="text-xs">Safe Range</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Wugar</p>
                      <p className="text-sm text-muted-foreground">Max safe buying price</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">UGX 6,500</p>
                      <Badge variant="outline" className="text-xs">Safe Range</Badge>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Robusta FAQ</p>
                      <p className="text-sm text-muted-foreground">Max safe buying price</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">UGX 5,200</p>
                      <Badge variant="outline" className="text-xs">Safe Range</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Outturn Simulator Tab */}
        <TabsContent value="outturn" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Outturn-Based Pricing Simulator
                </CardTitle>
                <CardDescription>Calculate safe buying prices based on quality parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="outturn">Outturn Percentage (%)</Label>
                    <Input
                      id="outturn"
                      type="number"
                      value={outturnData.outturnPercentage}
                      onChange={(e) => setOutturnData(prev => ({ ...prev, outturnPercentage: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="moisture">Moisture Content (%)</Label>
                    <Input
                      id="moisture"
                      type="number"
                      step="0.1"
                      value={outturnData.moisturePercent}
                      onChange={(e) => setOutturnData(prev => ({ ...prev, moisturePercent: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="group1">Group 1 Defects (%)</Label>
                    <Input
                      id="group1"
                      type="number"
                      step="0.1"
                      value={outturnData.group1Defects}
                      onChange={(e) => setOutturnData(prev => ({ ...prev, group1Defects: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="group2">Group 2 Defects (%)</Label>
                    <Input
                      id="group2"
                      type="number"
                      step="0.1"
                      value={outturnData.group2Defects}
                      onChange={(e) => setOutturnData(prev => ({ ...prev, group2Defects: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ref-price">Reference Price (UGX/kg)</Label>
                  <Input
                    id="ref-price"
                    type="number"
                    value={outturnData.referencePrice}
                    onChange={(e) => setOutturnData(prev => ({ ...prev, referencePrice: Number(e.target.value) }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Calculated Safe Buying Price</p>
                    <p className="text-3xl font-bold">UGX {outturnData.calculatedPrice.toLocaleString()}</p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Risk Assessment</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRiskColor(outturnData.riskLevel)}>
                        {outturnData.riskLevel.toUpperCase()} RISK
                      </Badge>
                      {outturnData.riskLevel === 'high' && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Quality Breakdown:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Outturn:</span>
                        <span>{outturnData.outturnPercentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moisture:</span>
                        <span>{outturnData.moisturePercent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Defects:</span>
                        <span>{(outturnData.group1Defects + outturnData.group2Defects).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {outturnData.riskLevel === 'high' && (
                    <Alert className="border-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        High risk purchase! Consider rejecting or renegotiating price.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Forecasting Tab */}
        <TabsContent value="forecasting" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Drugar:</span>
                    <span className="font-bold">1,250 bags</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wugar:</span>
                    <span className="font-bold">800 bags</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Robusta:</span>
                    <span className="font-bold">2,100 bags</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demand Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Export Demand</p>
                    <Progress value={75} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">75% of capacity</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local Market</p>
                    <Progress value={45} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">45% of capacity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Price Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-2 border rounded">
                    <p className="font-medium">Export Price</p>
                    <p className="text-lg font-bold text-green-600">UGX 9,200/kg</p>
                  </div>
                  <div className="p-2 border rounded">
                    <p className="font-medium">Local Price</p>
                    <p className="text-lg font-bold text-blue-600">UGX 8,800/kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Contract Pricing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Quantity (bags)</th>
                      <th className="text-left p-2">Price (UGX/kg)</th>
                      <th className="text-left p-2">Exchange Rate</th>
                      <th className="text-left p-2">USD Equivalent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractHistory.map((contract, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{contract.date}</td>
                        <td className="p-2">{contract.type}</td>
                        <td className="p-2">{contract.quantity}</td>
                        <td className="p-2">{contract.price.toLocaleString()}</td>
                        <td className="p-2">{contract.rate}</td>
                        <td className="p-2">${(contract.price / contract.rate).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generate Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Weekly Market Summary (PDF)
                </Button>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Procurement Price List (Excel)
                </Button>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Risk Assessment Report (PDF)
                </Button>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Contract Analysis (Excel)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Price Alert Thresholds</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input placeholder="Min Price" />
                      <Input placeholder="Max Price" />
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium">Exchange Rate Alerts</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input placeholder="Min Rate" />
                      <Input placeholder="Max Rate" />
                    </div>
                  </div>

                  <Button className="w-full">
                    Update Alert Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Market Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Analysis Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="arabica" fill="#8884d8" name="Arabica (¢/lb)" />
                  <Bar dataKey="robusta" fill="#82ca9d" name="Robusta ($/ton)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataAnalystDashboard;
