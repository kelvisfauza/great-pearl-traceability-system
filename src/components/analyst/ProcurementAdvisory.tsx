
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, AlertCircle, CheckCircle, Target, DollarSign } from 'lucide-react';
import { usePrices } from '@/contexts/PriceContext';

const ProcurementAdvisory = () => {
  const { prices } = usePrices();
  const [calculatorData, setCalculatorData] = useState({
    coffeeType: 'drugar',
    quantity: '',
    targetPrice: '',
    quality: 'premium'
  });

  const procurementRecommendations = [
    {
      grade: 'Drugar Premium',
      action: 'Strong Buy',
      priceRange: '8,400 - 8,600',
      reasoning: 'Price below historical average, high export demand',
      confidence: 85,
      risk: 'Low',
      timeframe: 'Next 2 weeks'
    },
    {
      grade: 'Wugar Standard',
      action: 'Hold',
      priceRange: '8,000 - 8,200',
      reasoning: 'Market stable, wait for better entry point',
      confidence: 70,
      risk: 'Medium',
      timeframe: 'Next month'
    },
    {
      grade: 'Robusta FAQ',
      action: 'Buy',
      priceRange: '7,600 - 7,800',
      reasoning: 'International prices rising, good margin potential',
      confidence: 78,
      risk: 'Low',
      timeframe: 'This week'
    }
  ];

  const calculateProfitability = () => {
    const basePrice = calculatorData.coffeeType === 'drugar' ? 8500 : 
                     calculatorData.coffeeType === 'wugar' ? 8200 : 7800;
    const quantity = parseFloat(calculatorData.quantity) || 0;
    const targetPrice = parseFloat(calculatorData.targetPrice) || basePrice;
    
    const totalCost = quantity * targetPrice;
    const processingCost = quantity * 300; // Processing cost per kg
    const exportPrice = basePrice + 700; // Export premium
    const totalRevenue = quantity * exportPrice;
    const netProfit = totalRevenue - totalCost - processingCost;
    const marginPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      totalCost,
      processingCost,
      totalRevenue,
      netProfit,
      marginPercentage
    };
  };

  const profitability = calculateProfitability();

  const suppliers = [
    {
      name: 'Kasese Coffee Farmers',
      location: 'Kasese',
      rating: 4.5,
      reliability: 'High',
      priceRange: '8,200 - 8,400',
      lastDelivery: '3 days ago',
      status: 'Active'
    },
    {
      name: 'Mbale Cooperative',
      location: 'Mbale',
      rating: 4.2,
      reliability: 'Medium',
      priceRange: '8,100 - 8,300',
      lastDelivery: '1 week ago',
      status: 'Available'
    },
    {
      name: 'Fort Portal Growers',
      location: 'Fort Portal',
      rating: 4.7,
      reliability: 'High',
      priceRange: '8,300 - 8,500',
      lastDelivery: '2 days ago',
      status: 'Preferred'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Procurement Advisory</h2>
        <p className="text-muted-foreground">Strategic buying recommendations and profitability analysis</p>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Buy Recommendations</TabsTrigger>
          <TabsTrigger value="calculator">Profitability Calculator</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {procurementRecommendations.map((rec, index) => (
              <Card key={index} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rec.grade}</CardTitle>
                    <Badge 
                      variant={rec.action === 'Strong Buy' ? 'default' : 
                              rec.action === 'Buy' ? 'secondary' : 'outline'}
                      className={rec.action === 'Strong Buy' ? 'bg-green-500' : ''}
                    >
                      {rec.action}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Price Range</div>
                      <div className="font-semibold">UGX {rec.priceRange}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="font-semibold flex items-center">
                        {rec.confidence}%
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${rec.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Risk Level</div>
                      <div className={`font-semibold ${
                        rec.risk === 'Low' ? 'text-green-600' : 
                        rec.risk === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {rec.risk}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Timeframe</div>
                      <div className="font-semibold">{rec.timeframe}</div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="text-sm font-medium mb-1">Analysis</div>
                    <div className="text-sm text-muted-foreground">{rec.reasoning}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Procurement Profitability Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="coffeeType">Coffee Type</Label>
                    <Select 
                      value={calculatorData.coffeeType} 
                      onValueChange={(value) => setCalculatorData({...calculatorData, coffeeType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drugar">Drugar</SelectItem>
                        <SelectItem value="wugar">Wugar</SelectItem>
                        <SelectItem value="robusta">Robusta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Quantity (kg)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={calculatorData.quantity}
                      onChange={(e) => setCalculatorData({...calculatorData, quantity: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="targetPrice">Target Purchase Price (UGX/kg)</Label>
                    <Input
                      id="targetPrice"
                      type="number"
                      placeholder="Enter target price"
                      value={calculatorData.targetPrice}
                      onChange={(e) => setCalculatorData({...calculatorData, targetPrice: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quality">Quality Grade</Label>
                    <Select 
                      value={calculatorData.quality} 
                      onValueChange={(value) => setCalculatorData({...calculatorData, quality: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Profitability Analysis
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-medium">UGX {profitability.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Cost:</span>
                        <span className="font-medium">UGX {profitability.processingCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Revenue:</span>
                        <span className="font-medium">UGX {profitability.totalRevenue.toLocaleString()}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">Net Profit:</span>
                        <span className={`font-bold ${profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          UGX {profitability.netProfit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">Profit Margin:</span>
                        <span className={`font-bold ${profitability.marginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitability.marginPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {profitability.marginPercentage > 15 && (
                      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">Excellent profit margin!</span>
                      </div>
                    )}
                    
                    {profitability.marginPercentage < 5 && profitability.marginPercentage >= 0 && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-700">Low profit margin</span>
                      </div>
                    )}
                    
                    {profitability.marginPercentage < 0 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">Loss expected</span>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {suppliers.map((supplier, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      <p className="text-muted-foreground">{supplier.location}</p>
                    </div>
                    <Badge variant={supplier.status === 'Preferred' ? 'default' : 'secondary'}>
                      {supplier.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Rating</div>
                      <div className="font-semibold flex items-center">
                        ⭐ {supplier.rating}/5
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Reliability</div>
                      <div className={`font-semibold ${
                        supplier.reliability === 'High' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {supplier.reliability}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Price Range</div>
                      <div className="font-semibold">UGX {supplier.priceRange}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Delivery</div>
                      <div className="font-semibold">{supplier.lastDelivery}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm">
                      Contact Supplier
                    </Button>
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

export default ProcurementAdvisory;
