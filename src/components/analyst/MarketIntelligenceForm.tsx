import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, 
  FileText, BarChart3, Target, Shield, Send, X, Plus, Upload, Image, Trash2
} from 'lucide-react';
import { MarketIntelligenceReport, getDefaultReport } from '@/hooks/useMarketIntelligenceReports';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarketIntelligenceFormProps {
  coffeeType: 'robusta' | 'drugar';
  existingReport?: MarketIntelligenceReport | null;
  onSubmit: (report: MarketIntelligenceReport) => Promise<boolean>;
  onCancel?: () => void;
}

const MARKET_DRIVERS = [
  'Supply constraints',
  'High demand',
  'Weather conditions',
  'Currency fluctuations',
  'Logistics issues',
  'Quality concerns',
  'Export restrictions',
  'Global market volatility',
  'Seasonal patterns',
  'Speculative trading'
];

const MarketIntelligenceForm: React.FC<MarketIntelligenceFormProps> = ({
  coffeeType,
  existingReport,
  onSubmit,
  onCancel
}) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const analystName = employee?.name || 'Unknown Analyst';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [report, setReport] = useState<MarketIntelligenceReport>(
    existingReport || getDefaultReport(coffeeType, analystName)
  );
  const [submitting, setSubmitting] = useState(false);
  const [customDriver, setCustomDriver] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    existingReport?.market_screenshot_url || null
  );

  const updateField = <K extends keyof MarketIntelligenceReport>(
    field: K, 
    value: MarketIntelligenceReport[K]
  ) => {
    setReport(prev => ({ ...prev, [field]: value }));
  };

  const toggleMarketDriver = (driver: string) => {
    const current = report.key_market_drivers;
    if (current.includes(driver)) {
      updateField('key_market_drivers', current.filter(d => d !== driver));
    } else {
      updateField('key_market_drivers', [...current, driver]);
    }
  };

  const addCustomDriver = () => {
    if (customDriver.trim() && !report.key_market_drivers.includes(customDriver.trim())) {
      updateField('key_market_drivers', [...report.key_market_drivers, customDriver.trim()]);
      setCustomDriver('');
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingScreenshot(true);

    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${coffeeType}-${report.report_date}-${timestamp}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('market-screenshots')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('market-screenshots')
        .getPublicUrl(filePath);

      setScreenshotPreview(publicUrl);
      updateField('market_screenshot_url', publicUrl);

      toast({
        title: "Screenshot uploaded",
        description: "Market overview screenshot attached successfully",
      });
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload screenshot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingScreenshot(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotPreview(null);
    updateField('market_screenshot_url', undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Calculate price change percentage
    const priceChange = report.opening_price > 0 
      ? ((report.closing_price - report.opening_price) / report.opening_price) * 100 
      : 0;
    
    const finalReport = {
      ...report,
      price_change_percent: Math.round(priceChange * 100) / 100,
      prepared_by: analystName,
      analyst_name: analystName
    };

    const success = await onSubmit(finalReport);
    setSubmitting(false);
    
    if (success && onCancel) {
      onCancel();
    }
  };

  const coffeeLabel = coffeeType === 'robusta' ? 'Robusta' : 'Drugar (Arabica)';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {coffeeLabel} Market Intelligence Report
              </CardTitle>
              <CardDescription>
                Daily market analysis for {new Date().toLocaleDateString()}
              </CardDescription>
            </div>
            {onCancel && (
              <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Accordion type="multiple" defaultValue={['section-1', 'section-2', 'section-3']} className="space-y-2">
        {/* Section 1: Report Identification */}
        <AccordionItem value="section-1" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">1</Badge>
              <span className="font-medium">Report Identification</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Date</Label>
                <Input 
                  type="date" 
                  value={report.report_date} 
                  onChange={(e) => updateField('report_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Reporting Period</Label>
                <Select value={report.reporting_period} onValueChange={(v) => updateField('reporting_period', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Market Reference</Label>
                <Select value={report.market_reference} onValueChange={(v) => updateField('market_reference', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICE">ICE (International Commodity Exchange)</SelectItem>
                    <SelectItem value="local">Local Market</SelectItem>
                    <SelectItem value="buyer_indications">Buyer Indications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Analyst Name</Label>
                <Input value={analystName} disabled className="bg-muted" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Market Summary */}
        <AccordionItem value="section-2" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">2</Badge>
              <span className="font-medium">Market Summary</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Market Direction</Label>
                <div className="flex gap-2">
                  {(['bullish', 'sideways', 'bearish'] as const).map((direction) => (
                    <Button
                      key={direction}
                      type="button"
                      variant={report.market_direction === direction ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateField('market_direction', direction)}
                    >
                      {direction === 'bullish' && <TrendingUp className="h-4 w-4 mr-2 text-green-500" />}
                      {direction === 'sideways' && <Minus className="h-4 w-4 mr-2 text-yellow-500" />}
                      {direction === 'bearish' && <TrendingDown className="h-4 w-4 mr-2 text-red-500" />}
                      {direction.charAt(0).toUpperCase() + direction.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Key Market Drivers</Label>
                <div className="flex flex-wrap gap-2">
                  {MARKET_DRIVERS.map((driver) => (
                    <Badge
                      key={driver}
                      variant={report.key_market_drivers.includes(driver) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleMarketDriver(driver)}
                    >
                      {driver}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input 
                    placeholder="Add custom driver..." 
                    value={customDriver}
                    onChange={(e) => setCustomDriver(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomDriver())}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addCustomDriver}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Narrative Summary</Label>
                <Textarea 
                  placeholder="Provide a brief overview of today's market conditions..."
                  value={report.narrative_summary}
                  onChange={(e) => updateField('narrative_summary', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Market Screenshot Upload */}
              <Separator className="my-4" />
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Market Overview Screenshot
                </Label>
                <p className="text-sm text-muted-foreground">
                  Attach a screenshot of the market chart or trading platform for reference
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />

                {screenshotPreview ? (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border bg-muted">
                      <img 
                        src={screenshotPreview} 
                        alt="Market overview" 
                        className="w-full max-h-64 object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveScreenshot}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace Screenshot
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingScreenshot}
                    className="w-full h-24 border-dashed"
                  >
                    {uploadingScreenshot ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Uploading...
                      </span>
                    ) : (
                      <span className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6" />
                        <span>Click to upload market screenshot</span>
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Price Movement Analysis */}
        <AccordionItem value="section-3" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">3</Badge>
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Price Movement Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Opening Price (UGX/kg)</Label>
                <Input 
                  type="number" 
                  value={report.opening_price || ''} 
                  onChange={(e) => updateField('opening_price', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Closing Price (UGX/kg)</Label>
                <Input 
                  type="number" 
                  value={report.closing_price || ''} 
                  onChange={(e) => updateField('closing_price', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Highest Price (UGX/kg)</Label>
                <Input 
                  type="number" 
                  value={report.highest_price || ''} 
                  onChange={(e) => updateField('highest_price', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Lowest Price (UGX/kg)</Label>
                <Input 
                  type="number" 
                  value={report.lowest_price || ''} 
                  onChange={(e) => updateField('lowest_price', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label>Price Movement Interpretation</Label>
              <Textarea 
                placeholder="Explain the cause of today's price movement..."
                value={report.price_movement_interpretation}
                onChange={(e) => updateField('price_movement_interpretation', e.target.value)}
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Volume & Supply Analysis */}
        <AccordionItem value="section-4" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">4</Badge>
              <span className="font-medium">Volume & Supply Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Global Supply Trend</Label>
                <Select value={report.global_supply_trend} onValueChange={(v) => updateField('global_supply_trend', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increasing">Increasing</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="decreasing">Decreasing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regional Supply (Uganda/EA)</Label>
                <Select value={report.regional_supply_trend} onValueChange={(v) => updateField('regional_supply_trend', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increasing">Increasing</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="decreasing">Decreasing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Factory Intake Volume (kg)</Label>
                <Input 
                  type="number" 
                  value={report.factory_intake_volume || ''} 
                  onChange={(e) => updateField('factory_intake_volume', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Buyer Demand Level</Label>
                <Select value={report.buyer_demand_level} onValueChange={(v) => updateField('buyer_demand_level', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Comparative Analysis */}
        <AccordionItem value="section-5" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">5</Badge>
              <span className="font-medium">Comparative Analysis</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Yesterday vs Today</Label>
                <Textarea 
                  placeholder="Compare price %, volume, and sentiment..."
                  value={report.yesterday_comparison}
                  onChange={(e) => updateField('yesterday_comparison', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Week vs Current Week</Label>
                <Textarea 
                  placeholder="Weekly comparison..."
                  value={report.weekly_comparison}
                  onChange={(e) => updateField('weekly_comparison', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Month vs Current Month</Label>
                <Textarea 
                  placeholder="Monthly comparison..."
                  value={report.monthly_comparison}
                  onChange={(e) => updateField('monthly_comparison', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Market Indicators & Sentiment */}
        <AccordionItem value="section-6" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">6</Badge>
              <span className="font-medium">Market Indicators & Sentiment</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Market Momentum</Label>
                <Select value={report.market_momentum} onValueChange={(v) => updateField('market_momentum', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strong_up">Strong Up ↑↑</SelectItem>
                    <SelectItem value="weak_up">Weak Up ↑</SelectItem>
                    <SelectItem value="neutral">Neutral →</SelectItem>
                    <SelectItem value="weak_down">Weak Down ↓</SelectItem>
                    <SelectItem value="strong_down">Strong Down ↓↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buyer Aggressiveness</Label>
                <Select value={report.buyer_aggressiveness} onValueChange={(v) => updateField('buyer_aggressiveness', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passive">Passive</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="very_aggressive">Very Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Selling Pressure</Label>
                <Select value={report.selling_pressure} onValueChange={(v) => updateField('selling_pressure', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={report.risk_level} onValueChange={(v) => updateField('risk_level', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 7: Market Outlook */}
        <AccordionItem value="section-7" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">7</Badge>
              <Target className="h-4 w-4" />
              <span className="font-medium">Market Outlook</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Short-Term Outlook (7 Days)</Label>
                <Textarea 
                  placeholder="Expected market behavior over the next 7 days..."
                  value={report.short_term_outlook}
                  onChange={(e) => updateField('short_term_outlook', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Medium-Term Outlook (30 Days)</Label>
                <Textarea 
                  placeholder="Expected market behavior over the next 30 days..."
                  value={report.medium_term_outlook}
                  onChange={(e) => updateField('medium_term_outlook', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Supporting Reasons</Label>
                <Textarea 
                  placeholder="Key factors supporting your outlook..."
                  value={report.outlook_supporting_reasons}
                  onChange={(e) => updateField('outlook_supporting_reasons', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 8: Strategic Recommendations */}
        <AccordionItem value="section-8" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">8</Badge>
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Strategic Recommendations</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recommended Action</Label>
                <div className="flex gap-2">
                  {(['buy', 'hold', 'delay', 'release'] as const).map((action) => (
                    <Button
                      key={action}
                      type="button"
                      variant={report.recommended_action === action ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => updateField('recommended_action', action)}
                    >
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recommended Price Min (UGX/kg)</Label>
                  <Input 
                    type="number" 
                    value={report.recommended_price_range_min || ''} 
                    onChange={(e) => updateField('recommended_price_range_min', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recommended Price Max (UGX/kg)</Label>
                  <Input 
                    type="number" 
                    value={report.recommended_price_range_max || ''} 
                    onChange={(e) => updateField('recommended_price_range_max', Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Volume Strategy</Label>
                <Textarea 
                  placeholder="Recommended buying/selling volume strategy..."
                  value={report.volume_strategy}
                  onChange={(e) => updateField('volume_strategy', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 9: Risks & Alerts */}
        <AccordionItem value="section-9" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">9</Badge>
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Risks & Alerts</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Market Risks</Label>
                <Textarea 
                  placeholder="Current market risks to monitor..."
                  value={report.market_risks}
                  onChange={(e) => updateField('market_risks', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Operational / Liquidity Risks</Label>
                <Textarea 
                  placeholder="Operational and liquidity concerns..."
                  value={report.operational_risks}
                  onChange={(e) => updateField('operational_risks', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Compliance / Contract Risks</Label>
                <Textarea 
                  placeholder="Compliance and contract-related risks..."
                  value={report.compliance_risks}
                  onChange={(e) => updateField('compliance_risks', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 10: Sign-off */}
        <AccordionItem value="section-10" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Badge variant="outline">10</Badge>
              <Shield className="h-4 w-4" />
              <span className="font-medium">Sign-off</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prepared By</Label>
                <Input value={analystName} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Reviewed / Approved By</Label>
                <Input 
                  placeholder="Name of reviewer (optional)"
                  value={report.reviewed_by || ''}
                  onChange={(e) => updateField('reviewed_by', e.target.value)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="gap-2">
          <Send className="h-4 w-4" />
          {submitting ? 'Submitting...' : `Submit ${coffeeLabel} Report`}
        </Button>
      </div>
    </form>
  );
};

export default MarketIntelligenceForm;
