
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, TrendingUp, AlertCircle, CheckCircle, Target, DollarSign, Plus } from 'lucide-react';
import { usePrices } from '@/contexts/PriceContext';
import { useProcurementRecommendations } from '@/hooks/useProcurementRecommendations';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useAuth } from '@/contexts/AuthContext';

const ProcurementAdvisory = () => {
  const { prices } = usePrices();
  const { employee } = useAuth();
  const { recommendations, loading: recommendationsLoading, addRecommendation } = useProcurementRecommendations();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  
  const [calculatorData, setCalculatorData] = useState({
    coffeeType: 'drugar',
    quantity: '',
    targetPrice: '',
    quality: 'premium',
    moistureContent: '12.5',
    screenSize: '15',
    defects: '2'
  });

  const [newRecommendation, setNewRecommendation] = useState({
    grade: '',
    action: 'Buy' as const,
    priceRange: '',
    reasoning: '',
    confidence: 70,
    risk: 'Medium' as const,
    timeframe: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddRecommendation = async () => {
    if (!newRecommendation.grade || !newRecommendation.priceRange || !newRecommendation.reasoning || !newRecommendation.timeframe) {
      return;
    }

    await addRecommendation({
      ...newRecommendation,
      createdBy: employee?.name || 'Unknown User'
    });

    // Reset form
    setNewRecommendation({
      grade: '',
      action: 'Buy',
      priceRange: '',
      reasoning: '',
      confidence: 70,
      risk: 'Medium',
      timeframe: ''
    });
    setShowAddForm(false);
  };

  // Standard international coffee profitability calculation
  const calculateProfitability = () => {
    const quantity = parseFloat(calculatorData.quantity) || 0;
    const targetPrice = parseFloat(calculatorData.targetPrice) || 0;
    const moistureContent = parseFloat(calculatorData.moistureContent) || 12.5;
    const defects = parseFloat(calculatorData.defects) || 0;
    
    // Moisture content adjustment (standard: 12.5%, penalty for higher moisture)
    const moistureAdjustment = moistureContent > 12.5 ? (moistureContent - 12.5) * 2 : 0; // 2% penalty per 1% excess
    
    // Quality adjustments based on defects
    const qualityAdjustment = defects > 5 ? defects * 1.5 : 0; // 1.5% penalty per defect above 5
    
    // Base costs per kg (international standards)
    const purchaseCost = quantity * targetPrice;
    const processingCost = quantity * 350; // Processing cost per kg
    const certificationCost = quantity * 25; // Quality certification
    const transportCost = quantity * 45; // Transport to port
    const exportTax = purchaseCost * 0.02; // 2% export tax
    const financingCost = purchaseCost * 0.015; // 1.5% financing cost
    
    const totalCost = purchaseCost + processingCost + certificationCost + transportCost + exportTax + financingCost;
    
    // Revenue calculation with quality adjustments
    const baseExportPrice = calculatorData.coffeeType === 'drugar' ? 9500 : 
                           calculatorData.coffeeType === 'wugar' ? 9200 : 8600;
    
    const qualityPremium = calculatorData.quality === 'premium' ? 500 : 
                          calculatorData.quality === 'standard' ? 200 : 0;
    
    const adjustedPrice = baseExportPrice + qualityPremium - (moistureAdjustment + qualityAdjustment) * baseExportPrice / 100;
    const totalRevenue = quantity * adjustedPrice;
    
    const netProfit = totalRevenue - totalCost;
    const marginPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    const roiPercentage = purchaseCost > 0 ? (netProfit / purchaseCost) * 100 : 0;

    return {
      purchaseCost,
      processingCost,
      certificationCost,
      transportCost,
      exportTax,
      financingCost,
      totalCost,
      totalRevenue,
      netProfit,
      marginPercentage,
      roiPercentage,
      adjustedPrice,
      qualityAdjustment: moistureAdjustment + qualityAdjustment
    };
  };

  const profitability = calculateProfitability();

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
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Buy Recommendations</h3>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Recommendation
            </Button>
          </div>

          {showAddForm && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Add New Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grade">Coffee Grade</Label>
                    <Input
                      id="grade"
                      placeholder="e.g., Drugar Premium"
                      value={newRecommendation.grade}
                      onChange={(e) => setNewRecommendation({...newRecommendation, grade: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="action">Action</Label>
                    <Select 
                      value={newRecommendation.action} 
                      onValueChange={(value) => setNewRecommendation({...newRecommendation, action: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Strong Buy">Strong Buy</SelectItem>
                        <SelectItem value="Buy">Buy</SelectItem>
                        <SelectItem value="Hold">Hold</SelectItem>
                        <SelectItem value="Sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priceRange">Price Range (UGX)</Label>
                    <Input
                      id="priceRange"
                      placeholder="e.g., 8,400 - 8,600"
                      value={newRecommendation.priceRange}
                      onChange={(e) => setNewRecommendation({...newRecommendation, priceRange: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Input
                      id="timeframe"
                      placeholder="e.g., Next 2 weeks"
                      value={newRecommendation.timeframe}
                      onChange={(e) => setNewRecommendation({...newRecommendation, timeframe: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="confidence">Confidence (%)</Label>
                    <Input
                      id="confidence"
                      type="number"
                      min="0"
                      max="100"
                      value={newRecommendation.confidence}
                      onChange={(e) => setNewRecommendation({...newRecommendation, confidence: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="risk">Risk Level</Label>
                    <Select 
                      value={newRecommendation.risk} 
                      onValueChange={(value) => setNewRecommendation({...newRecommendation, risk: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reasoning">Analysis & Reasoning</Label>
                  <Textarea
                    id="reasoning"
                    placeholder="Provide detailed analysis for this recommendation..."
                    value={newRecommendation.reasoning}
                    onChange={(e) => setNewRecommendation({...newRecommendation, reasoning: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddRecommendation}>Save Recommendation</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {recommendationsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading recommendations...</div>
                </CardContent>
              </Card>
            ) : recommendations.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    No recommendations yet. Add your first recommendation above.
                  </div>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((rec, index) => (
                <Card key={rec.id || index} className="relative">
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
                    <div className="text-xs text-muted-foreground">
                      Created by {rec.createdBy} • {new Date(rec.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                  
                  <div>
                    <Label htmlFor="moistureContent">Moisture Content (%)</Label>
                    <Input
                      id="moistureContent"
                      type="number"
                      step="0.1"
                      placeholder="12.5"
                      value={calculatorData.moistureContent}
                      onChange={(e) => setCalculatorData({...calculatorData, moistureContent: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="screenSize">Screen Size</Label>
                    <Input
                      id="screenSize"
                      placeholder="15"
                      value={calculatorData.screenSize}
                      onChange={(e) => setCalculatorData({...calculatorData, screenSize: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="defects">Defects (%)</Label>
                    <Input
                      id="defects"
                      type="number"
                      step="0.1"
                      placeholder="2"
                      value={calculatorData.defects}
                      onChange={(e) => setCalculatorData({...calculatorData, defects: e.target.value})}
                    />
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
                        <span>Purchase Cost:</span>
                        <span className="font-medium">UGX {profitability.purchaseCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing Cost:</span>
                        <span className="font-medium">UGX {profitability.processingCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Certification:</span>
                        <span className="font-medium">UGX {profitability.certificationCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transport:</span>
                        <span className="font-medium">UGX {profitability.transportCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Export Tax:</span>
                        <span className="font-medium">UGX {profitability.exportTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Financing Cost:</span>
                        <span className="font-medium">UGX {profitability.financingCost.toLocaleString()}</span>
                      </div>
                      <hr />
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Cost:</span>
                        <span className="font-semibold">UGX {profitability.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Expected Revenue:</span>
                        <span className="font-semibold">UGX {profitability.totalRevenue.toLocaleString()}</span>
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
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">ROI:</span>
                        <span className={`font-bold ${profitability.roiPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitability.roiPercentage.toFixed(1)}%
                        </span>
                      </div>
                      {profitability.qualityAdjustment > 0 && (
                        <div className="flex justify-between text-sm text-amber-600">
                          <span>Quality Adjustment:</span>
                          <span>-{profitability.qualityAdjustment.toFixed(1)}%</span>
                        </div>
                      )}
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
            {suppliersLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">Loading suppliers...</div>
                </CardContent>
              </Card>
            ) : suppliers.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-muted-foreground">
                    No suppliers found in database.
                  </div>
                </CardContent>
              </Card>
            ) : (
              suppliers.map((supplier, index) => (
                <Card key={supplier.id || index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <p className="text-muted-foreground">{supplier.code}</p>
                      </div>
                      <Badge variant="secondary">
                        Balance: UGX {supplier.opening_balance?.toLocaleString() || '0'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <div className="font-semibold">{supplier.phone}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Origin</div>
                        <div className="font-semibold">{supplier.origin}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Registered</div>
                        <div className="font-semibold">
                          {supplier.date_registered ? new Date(supplier.date_registered).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Contact Supplier
                      </Button>
                      <Button variant="outline" size="sm">
                        View History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProcurementAdvisory;
