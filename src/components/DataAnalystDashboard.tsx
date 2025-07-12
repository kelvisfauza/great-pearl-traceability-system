
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown, Globe } from 'lucide-react';
import MarketMonitor from './analyst/MarketMonitor';
import ProcurementAdvisory from './analyst/ProcurementAdvisory';
import OutturnSimulator from './analyst/OutturnSimulator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileText, Download, Calendar, Shield, BarChart3 } from 'lucide-react';

const DataAnalystDashboard = () => {
  // Risk alerts
  const riskAlerts = [
    { type: 'price', message: 'Arabica prices dropped 3% in last 24 hours', severity: 'warning' as const },
    { type: 'exchange', message: 'UGX weakened by 0.5% against USD', severity: 'info' as const },
    { type: 'procurement', message: 'Supplier offer exceeds safe buying range', severity: 'danger' as const }
  ];

  // Sample forecasting data
  const forecastData = [
    { category: "Production", value: 2847, target: 3000, percentage: 94.9 },
    { category: "Quality", value: 94.2, target: 95, percentage: 99.2 },
    { category: "Sales", value: 847, target: 900, percentage: 94.1 },
    { category: "Efficiency", value: 87.3, target: 90, percentage: 97.0 },
  ];

  const inventoryData = [
    { type: 'Drugar', amount: 1250, unit: 'bags' },
    { type: 'Wugar', amount: 800, unit: 'bags' },
    { type: 'Robusta', amount: 2100, unit: 'bags' }
  ];

  const contractHistory = [
    { date: '2024-12-15', type: 'Drugar', quantity: 500, price: 8200, rate: 3720 },
    { date: '2024-12-10', type: 'Wugar', quantity: 300, price: 7500, rate: 3715 },
    { date: '2024-12-05', type: 'Robusta', quantity: 800, price: 6000, rate: 3710 },
    { date: '2024-11-28', type: 'Drugar', quantity: 600, price: 8100, rate: 3705 }
  ];

  const chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Header with Risk Alerts */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Data Analyst Dashboard</h1>
          <p className="text-muted-foreground">Market analysis, pricing advisory, and risk management</p>
        </div>
        <div className="space-y-2 max-w-sm">
          {riskAlerts.map((alert, index) => (
            <Alert key={index} className={`${alert.severity === 'danger' ? 'border-red-500 bg-red-50' : 
              alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' : 'border-blue-500 bg-blue-50'}`}>
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
          <MarketMonitor />
        </TabsContent>

        {/* Procurement Advisory Tab */}
        <TabsContent value="procurement" className="space-y-6">
          <ProcurementAdvisory />
        </TabsContent>

        {/* Outturn Simulator Tab */}
        <TabsContent value="outturn" className="space-y-6">
          <OutturnSimulator />
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
                  {inventoryData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{item.type}:</span>
                      <span className="font-bold">{item.amount.toLocaleString()} {item.unit}</span>
                    </div>
                  ))}
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
                  <div className="p-3 border rounded bg-green-50">
                    <p className="font-medium text-sm">Export Price</p>
                    <p className="text-lg font-bold text-green-600">UGX 9,200/kg</p>
                  </div>
                  <div className="p-3 border rounded bg-blue-50">
                    <p className="font-medium text-sm">Local Price</p>
                    <p className="text-lg font-bold text-blue-600">UGX 8,800/kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {forecastData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.value} / {item.target}
                      </span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          item.percentage >= 95 ? 'bg-green-500' :
                          item.percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.percentage.toFixed(1)}% of target</span>
                      <Badge variant={
                        item.percentage >= 95 ? "default" :
                        item.percentage >= 80 ? "secondary" : "destructive"
                      }>
                        {item.percentage >= 95 ? "Excellent" :
                         item.percentage >= 80 ? "Good" : "Needs Attention"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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
                      <tr key={index} className="border-b hover:bg-muted/50">
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
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Weekly Market Summary (PDF)
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Procurement Price List (Excel)
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Risk Assessment Report (PDF)
                </Button>
                <Button className="w-full justify-start" variant="outline">
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
                    <h4 className="font-medium mb-2">Current Risk Level</h4>
                    <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Market volatility detected in arabica prices
                    </p>
                  </div>
                  
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">Alert Thresholds</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Price variance:</span>
                        <span>±5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exchange rate:</span>
                        <span>±2%</span>
                      </div>
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
              <ChartContainer config={chartConfig}>
                <BarChart data={forecastData} height={300}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="percentage" fill="var(--color-value)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataAnalystDashboard;
