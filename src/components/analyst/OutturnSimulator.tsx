import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calculator, PieChart, TrendingUp, AlertTriangle, Target, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { usePriceHistory } from '@/hooks/usePriceHistory';

const OutturnSimulator = () => {
  const { prices, loading: pricesLoading } = useReferencePrices();
  const { history, loading: historyLoading } = usePriceHistory(30);
  
  const [simulatorData, setSimulatorData] = useState({
    parchmentQuantity: '',
    coffeeType: 'arabica',
    moistureContent: '',
    fmContent: '',
    outturnRate: ''
  });

  const [simulationResults, setSimulationResults] = useState<any>(null);

  // Get current reference values based on coffee type
  const getCurrentParams = () => {
    if (simulatorData.coffeeType === 'arabica') {
      return {
        outturn: prices?.arabicaOutturn || 70,
        moisture: prices?.arabicaMoisture || 12.5,
        fm: prices?.arabicaFm || 5,
        buyingPrice: prices?.arabicaBuyingPrice || 8500
      };
    } else {
      return {
        outturn: prices?.robustaOutturn || 80,
        moisture: prices?.robustaMoisture || 13,
        fm: prices?.robustaFm || 3,
        buyingPrice: prices?.robustaBuyingPrice || 7500
      };
    }
  };

  const loadCurrentParams = () => {
    const params = getCurrentParams();
    setSimulatorData(prev => ({
      ...prev,
      moistureContent: params.moisture.toString(),
      fmContent: params.fm.toString(),
      outturnRate: params.outturn.toString()
    }));
  };

  const runSimulation = () => {
    const parchment = parseFloat(simulatorData.parchmentQuantity) || 0;
    const outturn = parseFloat(simulatorData.outturnRate) || getCurrentParams().outturn;
    const moisture = parseFloat(simulatorData.moistureContent) || getCurrentParams().moisture;
    const fm = parseFloat(simulatorData.fmContent) || getCurrentParams().fm;
    const buyingPrice = getCurrentParams().buyingPrice;

    if (parchment <= 0) return;

    // Calculate clean exportable based on outturn percentage
    const outturnDecimal = outturn / 100;
    const cleanExportable = parchment * outturnDecimal;
    const losses = parchment - cleanExportable;
    const lossPercentage = (losses / parchment) * 100;

    // Quality adjustments based on moisture and FM
    const moistureAdjustment = moisture <= 12.5 ? 1.0 : (moisture <= 13 ? 0.98 : 0.95);
    const fmAdjustment = fm <= 3 ? 1.0 : (fm <= 5 ? 0.97 : 0.93);
    const qualityFactor = moistureAdjustment * fmAdjustment;

    const adjustedPrice = Math.round(buyingPrice * qualityFactor);
    const totalValue = cleanExportable * adjustedPrice;
    const valuePerKgParchment = totalValue / parchment;

    // Quality score based on actual parameters
    const moistureScore = moisture <= 12 ? 100 : (moisture <= 13 ? 85 : (moisture <= 14 ? 70 : 50));
    const fmScore = fm <= 3 ? 100 : (fm <= 5 ? 80 : (fm <= 8 ? 60 : 40));
    const outturnScore = outturn >= 80 ? 100 : (outturn >= 75 ? 85 : (outturn >= 70 ? 70 : 55));
    const qualityScore = (moistureScore * 0.3 + fmScore * 0.3 + outturnScore * 0.4);

    setSimulationResults({
      parchmentInput: parchment,
      cleanExportable,
      losses,
      lossPercentage,
      outturnRate: outturn,
      moisture,
      fm,
      totalValue,
      valuePerKgParchment,
      pricePerKg: adjustedPrice,
      qualityScore,
      qualityFactor: qualityFactor * 100,
      coffeeType: simulatorData.coffeeType
    });
  };

  // Prepare historical chart data from real price history
  const historicalChartData = history
    .filter(record => record.arabica_outturn > 0 || record.robusta_outturn > 0)
    .slice(-14) // Last 14 days with data
    .map(record => ({
      date: new Date(record.price_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      arabicaOutturn: record.arabica_outturn || 0,
      robustaOutturn: record.robusta_outturn || 0,
      arabicaMoisture: record.arabica_moisture || 0,
      robustaMoisture: record.robusta_moisture || 0
    }));

  const currentParams = getCurrentParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outturn Simulator</h2>
          <p className="text-muted-foreground">Calculate processing yields using current market parameters</p>
        </div>
        {(pricesLoading || historyLoading) && (
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      <Tabs defaultValue="simulator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulator">Run Simulation</TabsTrigger>
          <TabsTrigger value="results">Results Analysis</TabsTrigger>
          <TabsTrigger value="history">Historical Trends</TabsTrigger>
          <TabsTrigger value="current">Current Parameters</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Input Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="parchmentQuantity">Parchment Quantity (kg)</Label>
                  <Input
                    id="parchmentQuantity"
                    type="number"
                    placeholder="Enter parchment quantity"
                    value={simulatorData.parchmentQuantity}
                    onChange={(e) => setSimulatorData({...simulatorData, parchmentQuantity: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="coffeeType">Coffee Type</Label>
                  <Select 
                    value={simulatorData.coffeeType} 
                    onValueChange={(value) => {
                      setSimulatorData({...simulatorData, coffeeType: value});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arabica">Arabica</SelectItem>
                      <SelectItem value="robusta">Robusta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="outturnRate">Outturn Rate (%)</Label>
                  <Input
                    id="outturnRate"
                    type="number"
                    placeholder={`Current: ${currentParams.outturn}%`}
                    value={simulatorData.outturnRate}
                    onChange={(e) => setSimulatorData({...simulatorData, outturnRate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="moistureContent">Moisture Content (%)</Label>
                  <Input
                    id="moistureContent"
                    type="number"
                    step="0.1"
                    placeholder={`Current: ${currentParams.moisture}%`}
                    value={simulatorData.moistureContent}
                    onChange={(e) => setSimulatorData({...simulatorData, moistureContent: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="fmContent">Foreign Matter / FM (%)</Label>
                  <Input
                    id="fmContent"
                    type="number"
                    step="0.1"
                    placeholder={`Current: ${currentParams.fm}%`}
                    value={simulatorData.fmContent}
                    onChange={(e) => setSimulatorData({...simulatorData, fmContent: e.target.value})}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={loadCurrentParams} variant="outline" className="flex-1">
                    Load Current Params
                  </Button>
                  <Button onClick={runSimulation} className="flex-1">
                    Run Simulation
                  </Button>
                </div>
              </CardContent>
            </Card>

            {simulationResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Simulation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded">
                      <div className="text-sm text-muted-foreground">Input Parchment</div>
                      <div className="text-lg font-bold">{simulationResults.parchmentInput.toLocaleString()} kg</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded">
                      <div className="text-sm text-muted-foreground">Clean Exportable</div>
                      <div className="text-lg font-bold text-primary">{simulationResults.cleanExportable.toFixed(0)} kg</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Outturn Rate:</span>
                      <span className="font-bold">{simulationResults.outturnRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={simulationResults.outturnRate} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Quality Score:</span>
                      <span className={`font-bold ${simulationResults.qualityScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {simulationResults.qualityScore.toFixed(1)}/100
                      </span>
                    </div>
                    <Progress value={simulationResults.qualityScore} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">Moisture:</span>
                      <span className="float-right font-medium">{simulationResults.moisture}%</span>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <span className="text-muted-foreground">FM:</span>
                      <span className="float-right font-medium">{simulationResults.fm}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Financial Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Adjusted Price/kg:</span>
                        <span className="font-medium">UGX {simulationResults.pricePerKg.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Value:</span>
                        <span className="font-medium">UGX {simulationResults.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 mt-1">
                        <span>Value per kg parchment:</span>
                        <span className="font-bold">UGX {simulationResults.valuePerKgParchment.toFixed(0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {simulationResults.outturnRate < 70 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-700">
                        Low outturn rate. Expected losses are high.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {simulationResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yield Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Clean Coffee Output</div>
                      <div className="text-3xl font-bold text-primary">{simulationResults.cleanExportable.toFixed(0)} kg</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {simulationResults.outturnRate.toFixed(1)}% of input parchment
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Processing Losses</div>
                      <div className="text-2xl font-bold text-destructive">{simulationResults.losses.toFixed(0)} kg</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {simulationResults.lossPercentage.toFixed(1)}% loss rate
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground">Quality Adjustment</div>
                      <div className="text-2xl font-bold">{simulationResults.qualityFactor.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Based on moisture & FM levels
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Parameters Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                      <span>Coffee Type</span>
                      <span className="font-bold capitalize">{simulationResults.coffeeType}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                      <span>Outturn Rate</span>
                      <span className="font-bold">{simulationResults.outturnRate}%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                      <span>Moisture Content</span>
                      <span className={`font-bold ${simulationResults.moisture <= 12.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {simulationResults.moisture}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                      <span>Foreign Matter (FM)</span>
                      <span className={`font-bold ${simulationResults.fm <= 3 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {simulationResults.fm}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded">
                      <span>Base Buying Price</span>
                      <span className="font-bold">UGX {currentParams.buyingPrice.toLocaleString()}/kg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Run a simulation to see detailed results</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Historical Outturn Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historicalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[60, 90]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="arabicaOutturn" 
                      name="Arabica Outturn %" 
                      stroke="#d97706" 
                      strokeWidth={2}
                      dot={{ fill: '#d97706', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="robustaOutturn" 
                      name="Robusta Outturn %" 
                      stroke="#059669" 
                      strokeWidth={2}
                      dot={{ fill: '#059669', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No historical outturn data available. Data will appear as prices are saved.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historical Moisture Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {historicalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={historicalChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[10, 16]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="arabicaMoisture" 
                      name="Arabica Moisture %" 
                      stroke="#7c3aed" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="robustaMoisture" 
                      name="Robusta Moisture %" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No historical moisture data available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="current" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600">Arabica Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Outturn Rate</span>
                  <span className="font-bold">{prices?.arabicaOutturn || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Moisture</span>
                  <span className="font-bold">{prices?.arabicaMoisture || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>FM</span>
                  <span className="font-bold">{prices?.arabicaFm || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-amber-500/10 rounded">
                  <span>Buying Price</span>
                  <span className="font-bold text-amber-600">UGX {(prices?.arabicaBuyingPrice || 0).toLocaleString()}/kg</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Robusta Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Outturn Rate</span>
                  <span className="font-bold">{prices?.robustaOutturn || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>Moisture</span>
                  <span className="font-bold">{prices?.robustaMoisture || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded">
                  <span>FM</span>
                  <span className="font-bold">{prices?.robustaFm || 0}%</span>
                </div>
                <div className="flex justify-between p-3 bg-green-500/10 rounded">
                  <span>Buying Price</span>
                  <span className="font-bold text-green-600">UGX {(prices?.robustaBuyingPrice || 0).toLocaleString()}/kg</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quality Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">Optimal Moisture</div>
                  <div className="text-2xl font-bold text-green-600">10-12.5%</div>
                  <div className="text-sm text-muted-foreground mt-1">Best quality & storage</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">Target FM</div>
                  <div className="text-2xl font-bold text-green-600">≤ 3%</div>
                  <div className="text-sm text-muted-foreground mt-1">Premium grade</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">Target Outturn</div>
                  <div className="text-2xl font-bold text-green-600">≥ 75%</div>
                  <div className="text-sm text-muted-foreground mt-1">Good processing yield</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OutturnSimulator;
