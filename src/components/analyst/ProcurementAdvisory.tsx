
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Calculator, AlertTriangle } from 'lucide-react';
import { useMarketData } from '@/hooks/useMarketData';

const ProcurementAdvisory = () => {
  const { marketData } = useMarketData();
  const [procurementSettings, setProcurementSettings] = useState({
    targetMargin: 15,
    productionCost: 5500,
  });

  const calculateRecommendedPrices = () => {
    const { targetMargin, productionCost } = procurementSettings;
    const marginMultiplier = (100 - targetMargin) / 100;
    
    return {
      drugar: Math.round(marketData.ucdaDrugar * marginMultiplier - productionCost),
      wugar: Math.round(marketData.ucdaWugar * marginMultiplier - productionCost),
      robusta: Math.round(marketData.ucdaRobusta * marginMultiplier - productionCost)
    };
  };

  const recommendedPrices = calculateRecommendedPrices();

  const getRiskLevel = (recommendedPrice: number, marketPrice: number) => {
    const ratio = recommendedPrice / marketPrice;
    if (ratio > 0.9) return { level: 'Safe Range', color: 'bg-green-100 text-green-800' };
    if (ratio > 0.8) return { level: 'Moderate Risk', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'High Risk', color: 'bg-red-100 text-red-800' };
  };

  const coffeeTypes = [
    { name: 'Drugar FAQ', recommended: recommendedPrices.drugar, market: marketData.ucdaDrugar },
    { name: 'Wugar', recommended: recommendedPrices.wugar, market: marketData.ucdaWugar },
    { name: 'Robusta FAQ', recommended: recommendedPrices.robusta, market: marketData.ucdaRobusta }
  ];

  return (
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
              value={procurementSettings.targetMargin}
              onChange={(e) => setProcurementSettings(prev => ({ 
                ...prev, 
                targetMargin: Number(e.target.value) 
              }))}
            />
          </div>
          <div>
            <Label htmlFor="production-cost">Average Production Cost (UGX/kg)</Label>
            <Input
              id="production-cost"
              type="number"
              value={procurementSettings.productionCost}
              onChange={(e) => setProcurementSettings(prev => ({ 
                ...prev, 
                productionCost: Number(e.target.value) 
              }))}
            />
          </div>
          <Button className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Update Calculations
          </Button>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Advisory Note</span>
            </div>
            <p className="text-xs text-blue-700">
              Prices are calculated based on current market rates minus your target margin and production costs. 
              Always consider quality parameters and supplier relationships.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Buying Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {coffeeTypes.map((coffee, index) => {
              const risk = getRiskLevel(coffee.recommended, coffee.market);
              return (
                <div key={index} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{coffee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Market: UGX {coffee.market.toLocaleString()}/kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      UGX {Math.max(0, coffee.recommended).toLocaleString()}
                    </p>
                    <Badge className={risk.color}>
                      {risk.level}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Calculation Formula</h4>
            <p className="text-xs text-muted-foreground">
              Max Buy Price = (Market Price × (100 - Target Margin)%) - Production Cost
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcurementAdvisory;
