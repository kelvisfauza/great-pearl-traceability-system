import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Coffee, 
  RefreshCw, 
  Printer,
  User,
  BarChart3,
  AlertCircle,
  Send,
  PlusCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useReactToPrint } from 'react-to-print';

interface MarketReport {
  id: string;
  report_date: string;
  report_type: 'auto' | 'manual';
  created_by: string;
  arabica_price: number;
  robusta_price: number;
  ice_arabica: number;
  ice_robusta: number;
  market_trend: string;
  analysis_notes: string;
  recommendations: string;
  created_at: string;
}

const DailyMarketReport = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const { prices } = useReferencePrices();
  const { history, comparison } = usePriceHistory();
  const printRef = useRef<HTMLDivElement>(null);

  const [reports, setReports] = useState<MarketReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('auto');
  
  // Manual report form state
  const [manualReport, setManualReport] = useState({
    analysis_notes: '',
    recommendations: '',
    market_trend: 'stable'
  });

  // Fetch existing reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      // Cast the data properly
      const typedData = (data || []).map(item => ({
        ...item,
        report_type: item.report_type as 'auto' | 'manual'
      }));
      setReports(typedData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Calculate price changes
  const getPriceChange = (current: number, previous: number) => {
    if (!previous) return { change: 0, percentage: 0 };
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return { change, percentage };
  };

  // Generate auto report
  const generateAutoReport = async () => {
    try {
      setGenerating(true);

      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Calculate market trend based on price movements
      const arabicaChange = comparison?.today?.arabica_buying_price && comparison?.yesterday?.arabica_buying_price
        ? getPriceChange(comparison.today.arabica_buying_price, comparison.yesterday.arabica_buying_price)
        : { change: 0, percentage: 0 };
      
      const robustaChange = comparison?.today?.robusta_buying_price && comparison?.yesterday?.robusta_buying_price
        ? getPriceChange(comparison.today.robusta_buying_price, comparison.yesterday.robusta_buying_price)
        : { change: 0, percentage: 0 };

      let marketTrend = 'stable';
      if (arabicaChange.percentage > 2 || robustaChange.percentage > 2) {
        marketTrend = 'bullish';
      } else if (arabicaChange.percentage < -2 || robustaChange.percentage < -2) {
        marketTrend = 'bearish';
      }

      // Generate analysis notes
      const analysisNotes = `
Market Analysis for ${format(new Date(), 'MMMM dd, yyyy')}:

ARABICA:
- Current Buying Price: UGX ${prices.arabicaBuyingPrice?.toLocaleString()}/kg
- ICE Reference: $${prices.iceArabica?.toFixed(2)}/lb
- Outturn: ${prices.arabicaOutturn}%, Moisture: ${prices.arabicaMoisture}%, FM: ${prices.arabicaFm}%
- Day Change: ${arabicaChange.change >= 0 ? '+' : ''}${arabicaChange.change.toLocaleString()} UGX (${arabicaChange.percentage >= 0 ? '+' : ''}${arabicaChange.percentage.toFixed(2)}%)

ROBUSTA:
- Current Buying Price: UGX ${prices.robustaBuyingPrice?.toLocaleString()}/kg
- ICE Reference: $${prices.robusta?.toFixed(2)}/MT
- Outturn: ${prices.robustaOutturn}%, Moisture: ${prices.robustaMoisture}%, FM: ${prices.robustaFm}%
- Day Change: ${robustaChange.change >= 0 ? '+' : ''}${robustaChange.change.toLocaleString()} UGX (${robustaChange.percentage >= 0 ? '+' : ''}${robustaChange.percentage.toFixed(2)}%)

Market Sentiment: ${marketTrend.toUpperCase()}
      `.trim();

      // Generate recommendations
      const recommendations = generateRecommendations(marketTrend, arabicaChange, robustaChange);

      const reportData = {
        report_date: today,
        report_type: 'auto' as const,
        created_by: employee?.name || 'System',
        arabica_price: prices.arabicaBuyingPrice,
        robusta_price: prices.robustaBuyingPrice,
        ice_arabica: prices.iceArabica,
        ice_robusta: prices.robusta,
        market_trend: marketTrend,
        analysis_notes: analysisNotes,
        recommendations
      };

      const { error } = await supabase
        .from('market_reports')
        .upsert(reportData, { onConflict: 'report_date,report_type' });

      if (error) throw error;

      toast({
        title: 'Report Generated',
        description: 'Daily market report has been generated successfully'
      });

      fetchReports();
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate report',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate recommendations based on market conditions
  const generateRecommendations = (
    trend: string, 
    arabicaChange: { change: number; percentage: number },
    robustaChange: { change: number; percentage: number }
  ) => {
    const recommendations = [];

    if (trend === 'bullish') {
      recommendations.push('• Market is showing upward momentum. Consider maintaining current buying prices to secure supply.');
      recommendations.push('• Monitor ICE futures for sustained price increases.');
      if (arabicaChange.percentage > 3) {
        recommendations.push('• Arabica prices rising significantly. Review premium offerings.');
      }
    } else if (trend === 'bearish') {
      recommendations.push('• Market is trending downward. Opportunity to negotiate better buying prices.');
      recommendations.push('• Consider building inventory at current lower prices.');
      if (robustaChange.percentage < -3) {
        recommendations.push('• Robusta prices dropping. Good time for bulk purchases.');
      }
    } else {
      recommendations.push('• Market is stable. Maintain current pricing strategy.');
      recommendations.push('• Focus on quality premiums to differentiate offerings.');
    }

    recommendations.push(`• Next day price recommendation: Arabica UGX ${Math.round(prices.arabicaBuyingPrice * (1 + arabicaChange.percentage / 200)).toLocaleString()}/kg, Robusta UGX ${Math.round(prices.robustaBuyingPrice * (1 + robustaChange.percentage / 200)).toLocaleString()}/kg`);

    return recommendations.join('\n');
  };

  // Submit manual report
  const submitManualReport = async () => {
    try {
      setGenerating(true);

      const today = format(new Date(), 'yyyy-MM-dd');

      const reportData = {
        report_date: today,
        report_type: 'manual' as const,
        created_by: employee?.name || 'Unknown',
        arabica_price: prices.arabicaBuyingPrice,
        robusta_price: prices.robustaBuyingPrice,
        ice_arabica: prices.iceArabica,
        ice_robusta: prices.robusta,
        market_trend: manualReport.market_trend,
        analysis_notes: manualReport.analysis_notes,
        recommendations: manualReport.recommendations
      };

      const { error } = await supabase
        .from('market_reports')
        .insert(reportData);

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: 'Your market analysis report has been saved'
      });

      setManualReport({ analysis_notes: '', recommendations: '', market_trend: 'stable' });
      fetchReports();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Market_Report_${format(new Date(), 'yyyy-MM-dd')}`
  });

  // Prepare chart data
  const chartData = history.slice(0, 7).reverse().map(h => ({
    date: format(new Date(h.price_date), 'MMM dd'),
    arabica: h.arabica_buying_price,
    robusta: h.robusta_buying_price,
    iceArabica: (h.ice_arabica || 0) * 100, // Scale for visibility
  }));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Bullish</Badge>;
      case 'bearish':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Bearish</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Stable</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Daily Market Reports
              </CardTitle>
              <CardDescription>
                Auto-generated and manual market analysis reports
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="auto">Auto Report</TabsTrigger>
              <TabsTrigger value="manual">Manual Report</TabsTrigger>
              <TabsTrigger value="history">Report History</TabsTrigger>
            </TabsList>

            {/* Auto Report Tab */}
            <TabsContent value="auto" className="space-y-6">
              <div ref={printRef} className="space-y-6 p-4 bg-background">
                {/* Report Header */}
                <div className="text-center border-b pb-4 print:block hidden">
                  <h1 className="text-2xl font-bold">Great Pearl Coffee</h1>
                  <p className="text-muted-foreground">Daily Market Analysis Report</p>
                  <p className="text-sm">{format(new Date(), 'MMMM dd, yyyy')}</p>
                </div>

                {/* Price Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">7-Day Price Movement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis fontSize={12} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))' 
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="arabica" 
                            stroke="hsl(var(--chart-1))" 
                            strokeWidth={2}
                            name="Arabica (UGX)"
                            dot={{ r: 4 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="robusta" 
                            stroke="hsl(var(--chart-2))" 
                            strokeWidth={2}
                            name="Robusta (UGX)"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Arabica Buying Price</p>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                            UGX {prices.arabicaBuyingPrice?.toLocaleString()}/kg
                          </p>
                        </div>
                        <Coffee className="h-8 w-8 text-amber-600/50" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Robusta Buying Price</p>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            UGX {prices.robustaBuyingPrice?.toLocaleString()}/kg
                          </p>
                        </div>
                        <Coffee className="h-8 w-8 text-emerald-600/50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Latest Auto Report */}
                {reports.filter(r => r.report_type === 'auto').length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Latest Analysis</CardTitle>
                        {getTrendBadge(reports.find(r => r.report_type === 'auto')?.market_trend || 'stable')}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {reports.find(r => r.report_type === 'auto')?.analysis_notes}
                        </pre>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          Recommendations
                        </h4>
                        <pre className="whitespace-pre-wrap text-sm">
                          {reports.find(r => r.report_type === 'auto')?.recommendations}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={generateAutoReport} disabled={generating}>
                  {generating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Today's Report
                </Button>
                <Button variant="outline" onClick={() => handlePrint()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </TabsContent>

            {/* Manual Report Tab */}
            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Create Manual Report
                  </CardTitle>
                  <CardDescription>
                    Add your own market analysis and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current prices reference */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Arabica</p>
                      <p className="font-semibold">UGX {prices.arabicaBuyingPrice?.toLocaleString()}/kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Robusta</p>
                      <p className="font-semibold">UGX {prices.robustaBuyingPrice?.toLocaleString()}/kg</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Market Trend Assessment</Label>
                    <div className="flex gap-2">
                      {['bullish', 'stable', 'bearish'].map(trend => (
                        <Button
                          key={trend}
                          variant={manualReport.market_trend === trend ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setManualReport(prev => ({ ...prev, market_trend: trend }))}
                          className="capitalize"
                        >
                          {getTrendIcon(trend)}
                          <span className="ml-1">{trend}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="analysis">Your Market Analysis</Label>
                    <Textarea
                      id="analysis"
                      placeholder="Enter your analysis of today's market conditions, price movements, and factors affecting the market..."
                      value={manualReport.analysis_notes}
                      onChange={(e) => setManualReport(prev => ({ ...prev, analysis_notes: e.target.value }))}
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recommendations">Recommendations</Label>
                    <Textarea
                      id="recommendations"
                      placeholder="Enter your recommendations for buying prices, strategy adjustments, and next day price suggestions..."
                      value={manualReport.recommendations}
                      onChange={(e) => setManualReport(prev => ({ ...prev, recommendations: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={submitManualReport} 
                    disabled={generating || !manualReport.analysis_notes}
                    className="w-full"
                  >
                    {generating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Report
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Report History Tab */}
            <TabsContent value="history" className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No reports found</div>
              ) : (
                reports.map(report => (
                  <Card key={report.id} className="hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {format(new Date(report.report_date), 'MMMM dd, yyyy')}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              {report.created_by}
                              <span className="mx-1">•</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {report.report_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrendBadge(report.market_trend)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Arabica</p>
                          <p className="font-medium">UGX {report.arabica_price?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Robusta</p>
                          <p className="font-medium">UGX {report.robusta_price?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ICE Arabica</p>
                          <p className="font-medium">${report.ice_arabica?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ICE Robusta</p>
                          <p className="font-medium">${report.ice_robusta?.toFixed(2)}</p>
                        </div>
                      </div>
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-primary">View Full Report</summary>
                        <div className="mt-3 space-y-3">
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-xs font-semibold mb-1">Analysis</p>
                            <pre className="whitespace-pre-wrap text-xs">{report.analysis_notes}</pre>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-lg">
                            <p className="text-xs font-semibold mb-1">Recommendations</p>
                            <pre className="whitespace-pre-wrap text-xs">{report.recommendations}</pre>
                          </div>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyMarketReport;
