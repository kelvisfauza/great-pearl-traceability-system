import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Coffee, TrendingUp, TrendingDown, Minus, CheckCircle, 
  Clock, AlertTriangle, Eye, Plus, History, BarChart3
} from 'lucide-react';
import { useMarketIntelligenceReports, MarketIntelligenceReport } from '@/hooks/useMarketIntelligenceReports';
import MarketIntelligenceForm from './MarketIntelligenceForm';
import { format, parseISO } from 'date-fns';

const MarketIntelligencePanel: React.FC = () => {
  const { 
    reports, 
    loading, 
    todayRobustaReport, 
    todayDrugarReport, 
    submitReport, 
    hasSubmittedToday 
  } = useMarketIntelligenceReports();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'robusta' | 'drugar' | 'history'>('overview');
  const [showRobustaForm, setShowRobustaForm] = useState(false);
  const [showDrugarForm, setShowDrugarForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MarketIntelligenceReport | null>(null);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      bullish: 'default',
      sideways: 'secondary',
      bearish: 'destructive'
    };
    return (
      <Badge variant={variants[direction] || 'secondary'} className="gap-1">
        {getDirectionIcon(direction)}
        {direction.charAt(0).toUpperCase() + direction.slice(1)}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive'
    };
    return <Badge variant={variants[risk] || 'secondary'}>{risk.toUpperCase()} Risk</Badge>;
  };

  const ReportCard = ({ report, type }: { report: MarketIntelligenceReport | null; type: 'robusta' | 'drugar' }) => {
    const label = type === 'robusta' ? 'Robusta' : 'Drugar (Arabica)';
    const setShowForm = type === 'robusta' ? setShowRobustaForm : setShowDrugarForm;
    const hasSubmitted = type === 'robusta' ? hasSubmittedToday.robusta : hasSubmittedToday.drugar;

    if (report) {
      return (
        <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">{label} Report</CardTitle>
              </div>
              {getDirectionBadge(report.market_direction)}
            </div>
            <CardDescription>Submitted today at {report.created_at ? format(parseISO(report.created_at), 'HH:mm') : '-'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Closing Price</p>
                <p className="font-semibold">UGX {report.closing_price?.toLocaleString()}/kg</p>
              </div>
              <div>
                <p className="text-muted-foreground">Change</p>
                <p className={`font-semibold ${report.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {report.price_change_percent >= 0 ? '+' : ''}{report.price_change_percent}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Action</p>
                <Badge variant="outline">{report.recommended_action?.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Risk</p>
                {getRiskBadge(report.risk_level)}
              </div>
            </div>
            {report.narrative_summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{report.narrative_summary}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedReport(report)}>
                <Eye className="h-4 w-4 mr-1" /> View Full Report
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-2 border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">{label} Report</CardTitle>
          </div>
          <CardDescription>Not submitted yet today</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowForm(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create {label} Report
          </Button>
        </CardContent>
      </Card>
    );
  };

  const ReportHistoryItem = ({ report }: { report: MarketIntelligenceReport }) => (
    <Card 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedReport(report)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coffee className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {report.coffee_type === 'robusta' ? 'Robusta' : 'Drugar (Arabica)'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(report.report_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getDirectionBadge(report.market_direction)}
            {getRiskBadge(report.risk_level)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FullReportView = ({ report }: { report: MarketIntelligenceReport }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {report.coffee_type === 'robusta' ? 'Robusta' : 'Drugar (Arabica)'} Market Intelligence Report
            </CardTitle>
            <CardDescription>
              {format(parseISO(report.report_date), 'MMMM dd, yyyy')} • Prepared by {report.prepared_by}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => setSelectedReport(null)}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Market Direction</p>
            {getDirectionBadge(report.market_direction)}
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Risk Level</p>
            {getRiskBadge(report.risk_level)}
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Recommended Action</p>
            <Badge variant="outline" className="mt-1">{report.recommended_action?.toUpperCase()}</Badge>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Price Change</p>
            <p className={`font-bold ${report.price_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {report.price_change_percent >= 0 ? '+' : ''}{report.price_change_percent}%
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Opening Price</p>
            <p className="font-semibold">UGX {report.opening_price?.toLocaleString()}/kg</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Closing Price</p>
            <p className="font-semibold">UGX {report.closing_price?.toLocaleString()}/kg</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Highest</p>
            <p className="font-semibold">UGX {report.highest_price?.toLocaleString()}/kg</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Lowest</p>
            <p className="font-semibold">UGX {report.lowest_price?.toLocaleString()}/kg</p>
          </div>
        </div>

        <Separator />

        {report.narrative_summary && (
          <div>
            <h4 className="font-semibold mb-2">Market Summary</h4>
            <p className="text-muted-foreground">{report.narrative_summary}</p>
          </div>
        )}

        {report.key_market_drivers?.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Key Market Drivers</h4>
            <div className="flex flex-wrap gap-2">
              {report.key_market_drivers.map((driver, i) => (
                <Badge key={i} variant="outline">{driver}</Badge>
              ))}
            </div>
          </div>
        )}

        {report.price_movement_interpretation && (
          <div>
            <h4 className="font-semibold mb-2">Price Movement Interpretation</h4>
            <p className="text-muted-foreground">{report.price_movement_interpretation}</p>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Short-Term Outlook (7 Days)</h4>
            <p className="text-muted-foreground">{report.short_term_outlook || 'Not provided'}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Medium-Term Outlook (30 Days)</h4>
            <p className="text-muted-foreground">{report.medium_term_outlook || 'Not provided'}</p>
          </div>
        </div>

        {report.volume_strategy && (
          <div>
            <h4 className="font-semibold mb-2">Volume Strategy</h4>
            <p className="text-muted-foreground">{report.volume_strategy}</p>
          </div>
        )}

        {(report.recommended_price_range_min > 0 || report.recommended_price_range_max > 0) && (
          <div className="bg-primary/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Recommended Price Range</h4>
            <p className="text-lg font-bold">
              UGX {report.recommended_price_range_min?.toLocaleString()} - {report.recommended_price_range_max?.toLocaleString()} /kg
            </p>
          </div>
        )}

        {(report.market_risks || report.operational_risks || report.compliance_risks) && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Risks & Alerts
              </h4>
              <div className="space-y-3">
                {report.market_risks && (
                  <div>
                    <p className="text-sm font-medium">Market Risks</p>
                    <p className="text-sm text-muted-foreground">{report.market_risks}</p>
                  </div>
                )}
                {report.operational_risks && (
                  <div>
                    <p className="text-sm font-medium">Operational Risks</p>
                    <p className="text-sm text-muted-foreground">{report.operational_risks}</p>
                  </div>
                )}
                {report.compliance_risks && (
                  <div>
                    <p className="text-sm font-medium">Compliance Risks</p>
                    <p className="text-sm text-muted-foreground">{report.compliance_risks}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Clock className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading market intelligence reports...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedReport) {
    return <FullReportView report={selectedReport} />;
  }

  if (showRobustaForm) {
    return (
      <MarketIntelligenceForm
        coffeeType="robusta"
        existingReport={todayRobustaReport}
        onSubmit={submitReport}
        onCancel={() => setShowRobustaForm(false)}
      />
    );
  }

  if (showDrugarForm) {
    return (
      <MarketIntelligenceForm
        coffeeType="drugar"
        existingReport={todayDrugarReport}
        onSubmit={submitReport}
        onCancel={() => setShowDrugarForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Intelligence Reports
              </CardTitle>
              <CardDescription>
                Daily comprehensive market analysis for Robusta and Drugar (Arabica) coffee
              </CardDescription>
            </div>
            <Badge variant={hasSubmittedToday.robusta && hasSubmittedToday.drugar ? 'default' : 'destructive'}>
              {hasSubmittedToday.robusta && hasSubmittedToday.drugar 
                ? 'All Reports Submitted' 
                : `${(hasSubmittedToday.robusta ? 1 : 0) + (hasSubmittedToday.drugar ? 1 : 0)}/2 Submitted`}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Today's Overview</TabsTrigger>
          <TabsTrigger value="robusta">Robusta</TabsTrigger>
          <TabsTrigger value="drugar">Drugar</TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportCard report={todayRobustaReport} type="robusta" />
            <ReportCard report={todayDrugarReport} type="drugar" />
          </div>
        </TabsContent>

        <TabsContent value="robusta" className="mt-6">
          <MarketIntelligenceForm
            coffeeType="robusta"
            existingReport={todayRobustaReport}
            onSubmit={submitReport}
          />
        </TabsContent>

        <TabsContent value="drugar" className="mt-6">
          <MarketIntelligenceForm
            coffeeType="drugar"
            existingReport={todayDrugarReport}
            onSubmit={submitReport}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View past market intelligence reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No reports yet</p>
                  ) : (
                    reports.map((report) => (
                      <ReportHistoryItem key={report.id} report={report} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketIntelligencePanel;
