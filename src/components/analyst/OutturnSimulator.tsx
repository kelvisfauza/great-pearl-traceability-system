
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calculator, PieChart, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const OutturnSimulator = () => {
  const [simulatorData, setSimulatorData] = useState({
    parchmentQuantity: '',
    coffeeType: 'drugar',
    moistureContent: '12',
    qualityGrade: 'premium',
    processingMethod: 'washed'
  });

  const [simulationResults, setSimulationResults] = useState(null);

  const outturnRates = {
    drugar: { premium: 0.82, standard: 0.78, commercial: 0.74 },
    wugar: { premium: 0.80, standard: 0.76, commercial: 0.72 },
    robusta: { premium: 0.84, standard: 0.80, commercial: 0.76 }
  };

  const qualityFactors = {
    moisture: {
      '10': 1.05,
      '11': 1.02,
      '12': 1.00,
      '13': 0.98,
      '14': 0.95
    },
    processing: {
      washed: 1.00,
      natural: 0.96,
      honey: 0.98
    }
  };

  const runSimulation = () => {
    const parchment = parseFloat(simulatorData.parchmentQuantity) || 0;
    const baseOutturn = outturnRates[simulatorData.coffeeType][simulatorData.qualityGrade];
    const moistureFactor = qualityFactors.moisture[simulatorData.moistureContent] || 1.0;
    const processingFactor = qualityFactors.processing[simulatorData.processingMethod];
    
    const finalOutturn = baseOutturn * moistureFactor * processingFactor;
    const cleanExportable = parchment * finalOutturn;
    const losses = parchment - cleanExportable;
    const lossPercentage = (losses / parchment) * 100;

    // Price calculations
    const exportPrices = {
      drugar: { premium: 9200, standard: 8800, commercial: 8400 },
      wugar: { premium: 8800, standard: 8400, commercial: 8000 },
      robusta: { premium: 8200, standard: 7800, commercial: 7400 }
    };

    const pricePerKg = exportPrices[simulatorData.coffeeType][simulatorData.qualityGrade];
    const totalValue = cleanExportable * pricePerKg;
    const valuePerKgParchment = totalValue / parchment;

    // Defect analysis
    const defects = {
      group1: Math.random() * 3,
      group2: Math.random() * 8,
      pods: Math.random() * 2,
      husks: Math.random() * 1.5,
      stones: Math.random() * 0.5
    };

    setSimulationResults({
      parchmentInput: parchment,
      cleanExportable,
      losses,
      lossPercentage,
      outturnRate: finalOutturn * 100,
      totalValue,
      valuePerKgParchment,
      pricePerKg,
      defects,
      qualityScore: 100 - (defects.group1 * 2 + defects.group2 + defects.pods + defects.husks + defects.stones)
    });
  };

  const historicalData = [
    { month: 'Jan', outturn: 78 },
    { month: 'Feb', outturn: 80 },
    { month: 'Mar', outturn: 76 },
    { month: 'Apr', outturn: 82 },
    { month: 'May', outturn: 79 },
    { month: 'Jun', outturn: 81 }
  ];

  const benchmarkData = [
    { name: 'Your Simulation', value: simulationResults?.outturnRate || 0, color: '#8884d8' },
    { name: 'Industry Average', value: 78, color: '#82ca9d' },
    { name: 'Best Practice', value: 85, color: '#ffc658' }
  ];

  const defectBreakdown = simulationResults ? [
    { name: 'Group 1 Defects', value: simulationResults.defects.group1, color: '#ff6b6b' },
    { name: 'Group 2 Defects', value: simulationResults.defects.group2, color: '#ffa726' },
    { name: 'Pods', value: simulationResults.defects.pods, color: '#66bb6a' },
    { name: 'Husks', value: simulationResults.defects.husks, color: '#42a5f5' },
    { name: 'Stones', value: simulationResults.defects.stones, color: '#ab47bc' }
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Outturn Simulator</h2>
        <p className="text-muted-foreground">Predict processing yields and quality outcomes</p>
      </div>

      <Tabs defaultValue="simulator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="simulator">Run Simulation</TabsTrigger>
          <TabsTrigger value="results">Results Analysis</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="history">Historical Data</TabsTrigger>
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
                    onValueChange={(value) => setSimulatorData({...simulatorData, coffeeType: value})}
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
                  <Label htmlFor="qualityGrade">Quality Grade</Label>
                  <Select 
                    value={simulatorData.qualityGrade} 
                    onValueChange={(value) => setSimulatorData({...simulatorData, qualityGrade: value})}
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
                  <Select 
                    value={simulatorData.moistureContent} 
                    onValueChange={(value) => setSimulatorData({...simulatorData, moistureContent: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="11">11%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="13">13%</SelectItem>
                      <SelectItem value="14">14%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="processingMethod">Processing Method</Label>
                  <Select 
                    value={simulatorData.processingMethod} 
                    onValueChange={(value) => setSimulatorData({...simulatorData, processingMethod: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="washed">Washed</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="honey">Honey Process</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={runSimulation} className="w-full">
                  Run Simulation
                </Button>
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
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-sm text-muted-foreground">Input Parchment</div>
                      <div className="text-lg font-bold">{simulationResults.parchmentInput.toLocaleString()} kg</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-sm text-muted-foreground">Clean Exportable</div>
                      <div className="text-lg font-bold text-green-600">{simulationResults.cleanExportable.toFixed(0)} kg</div>
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

                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Financial Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Price per kg:</span>
                        <span className="font-medium">UGX {simulationResults.pricePerKg.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Value:</span>
                        <span className="font-medium">UGX {simulationResults.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Value per kg parchment:</span>
                        <span className="font-bold">UGX {simulationResults.valuePerKgParchment.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {simulationResults.outturnRate < 75 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-700">
                        Low outturn rate detected. Consider reviewing processing methods.
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
                  <CardTitle>Defect Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={defectBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {defectBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {defectBreakdown.map((defect, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: defect.color }}></div>
                          <span>{defect.name}</span>
                        </div>
                        <span className="font-medium">{defect.value.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Benchmarks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={benchmarkData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
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

        <TabsContent value="benchmarks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Industry Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">78%</div>
                <div className="text-sm text-muted-foreground">Typical outturn rate across Uganda</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Best Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2 text-green-600">85%</div>
                <div className="text-sm text-muted-foreground">Achievable with optimal processing</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Your Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2 text-blue-600">82%</div>
                <div className="text-sm text-muted-foreground">Recommended target for premium grade</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded">
                  <div className="font-medium">Moisture Control</div>
                  <div className="text-sm text-muted-foreground">Maintain 10-12% moisture for optimal outturn</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="font-medium">Quality Sorting</div>
                  <div className="text-sm text-muted-foreground">Remove defects early in processing to improve final grade</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="font-medium">Processing Method</div>
                  <div className="text-sm text-muted-foreground">Washed processing typically yields higher outturn rates</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Outturn Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="outturn" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OutturnSimulator;
