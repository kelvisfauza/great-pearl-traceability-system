
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertTriangle } from 'lucide-react';

const OutturnSimulator = () => {
  const [outturnData, setOutturnData] = useState({
    outturnPercentage: 78,
    group1Defects: 2.5,
    group2Defects: 1.8,
    moisturePercent: 12.5,
    referencePrice: 8500,
    calculatedPrice: 0,
    riskLevel: 'medium' as 'low' | 'medium' | 'high'
  });

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
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const qualityFactors = [
    { 
      label: 'Outturn Percentage', 
      value: outturnData.outturnPercentage, 
      unit: '%',
      impact: 'Primary factor - directly affects yield',
      good: outturnData.outturnPercentage >= 80
    },
    { 
      label: 'Moisture Content', 
      value: outturnData.moisturePercent, 
      unit: '%',
      impact: 'Standard is 12% - excess reduces price',
      good: outturnData.moisturePercent <= 12
    },
    { 
      label: 'Group 1 Defects', 
      value: outturnData.group1Defects, 
      unit: '%',
      impact: 'Major defects - high deduction',
      good: outturnData.group1Defects <= 2
    },
    { 
      label: 'Group 2 Defects', 
      value: outturnData.group2Defects, 
      unit: '%',
      impact: 'Minor defects - moderate deduction',
      good: outturnData.group2Defects <= 3
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quality Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="outturn">Outturn Percentage (%)</Label>
              <Input
                id="outturn"
                type="number"
                value={outturnData.outturnPercentage}
                onChange={(e) => setOutturnData(prev => ({ 
                  ...prev, 
                  outturnPercentage: Number(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="moisture">Moisture Content (%)</Label>
              <Input
                id="moisture"
                type="number"
                step="0.1"
                value={outturnData.moisturePercent}
                onChange={(e) => setOutturnData(prev => ({ 
                  ...prev, 
                  moisturePercent: Number(e.target.value) 
                }))}
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
                onChange={(e) => setOutturnData(prev => ({ 
                  ...prev, 
                  group1Defects: Number(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label htmlFor="group2">Group 2 Defects (%)</Label>
              <Input
                id="group2"
                type="number"
                step="0.1"
                value={outturnData.group2Defects}
                onChange={(e) => setOutturnData(prev => ({ 
                  ...prev, 
                  group2Defects: Number(e.target.value) 
                }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ref-price">Reference Price (UGX/kg)</Label>
            <Input
              id="ref-price"
              type="number"
              value={outturnData.referencePrice}
              onChange={(e) => setOutturnData(prev => ({ 
                ...prev, 
                referencePrice: Number(e.target.value) 
              }))}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quality Assessment</h4>
            {qualityFactors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div>
                  <span className="text-sm font-medium">{factor.label}</span>
                  <p className="text-xs text-muted-foreground">{factor.impact}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${factor.good ? 'text-green-600' : 'text-red-600'}`}>
                    {factor.value}{factor.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50">
              <p className="text-sm text-muted-foreground mb-1">Calculated Safe Buying Price</p>
              <p className="text-3xl font-bold text-green-600">
                UGX {outturnData.calculatedPrice.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Per kilogram of parchment coffee
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Risk Assessment</p>
              <div className="flex items-center gap-2">
                <Badge className={getRiskColor(outturnData.riskLevel)}>
                  {outturnData.riskLevel.toUpperCase()} RISK
                </Badge>
                {outturnData.riskLevel === 'high' && (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Price Adjustment Breakdown:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Base Reference Price:</span>
                  <span>UGX {outturnData.referencePrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outturn Adjustment:</span>
                  <span>{outturnData.outturnPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Defects:</span>
                  <span>-{(outturnData.group1Defects + outturnData.group2Defects).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Moisture Penalty:</span>
                  <span>{outturnData.moisturePercent > 12 ? `-${((outturnData.moisturePercent - 12) * 2).toFixed(1)}%` : '0%'}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Final Price:</span>
                  <span>UGX {outturnData.calculatedPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {outturnData.riskLevel === 'high' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>High Risk Purchase!</strong> Consider rejecting this lot or renegotiating the price. 
                  Quality parameters are below acceptable standards.
                </AlertDescription>
              </Alert>
            )}

            {outturnData.riskLevel === 'medium' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <strong>Moderate Risk:</strong> Proceed with caution. Consider requesting quality improvements 
                  or adjusting the purchase price accordingly.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutturnSimulator;
