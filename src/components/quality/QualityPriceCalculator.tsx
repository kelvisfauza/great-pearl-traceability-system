import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Loader2, Save, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useReactToPrint } from 'react-to-print';
import QuickAnalysisPrint from './QuickAnalysisPrint';
import RobustaPriceCalculator from './RobustaPriceCalculator';

interface PriceCalculatorState {
  refPrice: string;
  moisture: string;
  gp1: string;
  gp2: string;
  less12: string;
  pods: string;
  husks: string;
  stones: string;
  discretion: string;
}

interface CalculationResults {
  fm: number;
  actualOtt: number;
  cleanD14: number;
  outturn: number | string;
  outturnPrice: number | string | null;
  finalPrice: number | string | null;
  qualityNote: string;
  rejectOutturnPrice: boolean;
  rejectFinal: boolean;
}

interface ReferencePrices {
  arabica_buying_price: number;
  robusta_buying_price: number;
  drugar_local: number;
  robusta_faq_local: number;
}

interface SavedAnalysis {
  id: string;
  supplier_name: string;
  coffee_type: string;
  ref_price: number;
  moisture: number;
  gp1: number;
  gp2: number;
  less12: number;
  pods: number;
  husks: number;
  stones: number;
  discretion: number;
  fm: number;
  actual_ott: number;
  clean_d14: number;
  outturn: number;
  outturn_price: number;
  final_price: number;
  quality_note: string;
  is_rejected: boolean;
  created_by: string;
  created_at: string;
}

const QualityPriceCalculator = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const [coffeeType, setCoffeeType] = useState<'arabica' | 'robusta'>('arabica');
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [referencePrices, setReferencePrices] = useState<ReferencePrices | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedAnalysis | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [state, setState] = useState<PriceCalculatorState>({
    refPrice: '',
    moisture: '',
    gp1: '',
    gp2: '',
    less12: '',
    pods: '',
    husks: '',
    stones: '',
    discretion: '500' // Default discretion of 500 UGX
  });

  const [results, setResults] = useState<CalculationResults>({
    fm: 0,
    actualOtt: 0,
    cleanD14: 0,
    outturn: 0,
    outturnPrice: null,
    finalPrice: null,
    qualityNote: '',
    rejectOutturnPrice: false,
    rejectFinal: false
  });

  // Fetch reference prices from database
  const fetchReferencePrices = async () => {
    setLoadingPrices(true);
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('arabica_buying_price, robusta_buying_price, drugar_local, robusta_faq_local')
        .eq('price_type', 'reference_prices')
        .single();

      if (error) {
        console.error('Error fetching reference prices:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch reference prices',
          variant: 'destructive'
        });
        return;
      }

      if (data) {
        setReferencePrices(data);
        // Set initial reference price based on coffee type
        const price = coffeeType === 'arabica' 
          ? (data.arabica_buying_price || data.drugar_local) 
          : (data.robusta_buying_price || data.robusta_faq_local);
        setState(prev => ({ ...prev, refPrice: price?.toString() || '' }));
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
    } finally {
      setLoadingPrices(false);
    }
  };

  useEffect(() => {
    fetchReferencePrices();
  }, []);

  // Update reference price when coffee type changes
  useEffect(() => {
    if (referencePrices) {
      const price = coffeeType === 'arabica' 
        ? (referencePrices.arabica_buying_price || referencePrices.drugar_local) 
        : (referencePrices.robusta_buying_price || referencePrices.robusta_faq_local);
      setState(prev => ({ ...prev, refPrice: price?.toString() || '' }));
    }
  }, [coffeeType, referencePrices]);

  const over = (x: number, lim: number) => Math.max(0, x - lim);
  const fmt = (n: number) => isFinite(n) ? n.toLocaleString('en-UG', { maximumFractionDigits: 0 }) : '—';
  const pct = (n: number) => isFinite(n) ? n.toFixed(1) + '%' : '—';
  
  const parseValue = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculate = () => {
    const refPrice = parseValue(state.refPrice);
    const moisture = parseValue(state.moisture);
    const gp1 = parseValue(state.gp1);
    const gp2 = parseValue(state.gp2);
    const less12 = parseValue(state.less12);
    const pods = parseValue(state.pods);
    const husks = parseValue(state.husks);
    const stones = parseValue(state.stones);
    const discretion = parseValue(state.discretion);

    const fm = pods + husks + stones;
    const actualOtt = 100 - (gp1 + gp2 + pods + husks + stones + less12);

    const cleanD14 = 100
      - over(moisture, 14)
      - over(gp1, 4)
      - over(gp2, 10)
      - over(less12, 1);

    let outturn: number | string;
    if (less12 > 3) {
      outturn = 'REJECT';
    } else {
      outturn = 100
        - over(moisture, 14)
        - over(gp1, 4)
        - over(gp2, 10)
        - (pods > 0 ? pods : 0)
        - (husks > 0 ? husks : 0)
        - (stones > 0 ? stones : 0)
        - over(less12, 1);
    }

    const moistPenalty = (moisture >= 14) ? over(moisture, 14) * refPrice * 0.02 : 0;
    const gp1Penalty = over(gp1, 4) * 50;
    const gp2Penalty = over(gp2, 10) * 20;
    const d14LowPenalty = (cleanD14 < 78) ? (78 - cleanD14) * 50 : 0;
    const d14HighBonus = (cleanD14 > 82) ? (cleanD14 - 82) * 50 : 0;

    let outturnPrice: number | string | null = null;
    const rejectOutturnPrice = (moisture > 16.5) || (gp1 > 10) || (gp2 > 25) || (less12 > 3) || (fm > 6);
    
    if (refPrice <= 0 || isNaN(refPrice)) {
      outturnPrice = null;
    } else if (rejectOutturnPrice) {
      outturnPrice = 'REJECT';
    } else {
      const premiumCondition = (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1);
      const premiumBlock = Math.min((premiumCondition ? 2000 : 0) + d14HighBonus, 2000);
      const less12Penalty_OP = over(less12, 1) * 30;
      outturnPrice = refPrice + premiumBlock - moistPenalty - gp1Penalty - gp2Penalty - d14LowPenalty + d14HighBonus - less12Penalty_OP + discretion;
    }

    let finalPrice: number | string | null = null;
    const rejectFinal = (moisture > 16.5) || (gp1 > 10) || (gp2 > 25) || (less12 > 3) || (fm > 6) || (pods > 6) || (husks > 6) || (stones > 6);
    
    if (refPrice <= 0 || isNaN(refPrice)) {
      finalPrice = null;
    } else if (rejectFinal) {
      finalPrice = 'REJECT';
    } else {
      const premiumConditionF = (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0);
      const premiumBlockF = Math.min((premiumConditionF ? 2000 : 0) + d14HighBonus, 2000);
      const fmPenalty = pods * 100 + husks * 150 + stones * 150;
      const less12Penalty_FP = over(less12, 1) * 40;
      finalPrice = refPrice + premiumBlockF - moistPenalty - gp1Penalty - gp2Penalty - d14LowPenalty + d14HighBonus - fmPenalty - less12Penalty_FP + discretion;
    }

    let qualityNote = '';
    if (moisture > 16.5) qualityNote = `Rejected: Moisture above tolerance by ${(moisture - 16.5).toFixed(1)}%`;
    else if (gp1 > 10) qualityNote = `Rejected: GP1 defects above tolerance by ${(gp1 - 10).toFixed(1)}%`;
    else if (gp2 > 25) qualityNote = `Rejected: GP2 defects above tolerance by ${(gp2 - 25).toFixed(1)}%`;
    else if (less12 > 3) qualityNote = `Rejected: Less‑12 above tolerance by ${(less12 - 3).toFixed(1)}%`;
    else if (fm > 6) qualityNote = `Rejected: Foreign Matter above tolerance by ${(fm - 6).toFixed(1)}%`;
    else {
      qualityNote = ((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0)
        ? 'Bonus: Premium Price Applied'
        : 'Standard/Penalty Price Applied');
    }

    setResults({
      fm,
      actualOtt,
      cleanD14,
      outturn,
      outturnPrice,
      finalPrice,
      qualityNote,
      rejectOutturnPrice,
      rejectFinal
    });
  };

  useEffect(() => {
    calculate();
  }, [state]);

  const handleInputChange = (field: keyof PriceCalculatorState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    const price = referencePrices 
      ? (coffeeType === 'arabica' 
          ? (referencePrices.arabica_buying_price || referencePrices.drugar_local) 
          : (referencePrices.robusta_buying_price || referencePrices.robusta_faq_local))
      : '';
    setState({
      refPrice: price?.toString() || '',
      moisture: '',
      gp1: '',
      gp2: '',
      less12: '',
      pods: '',
      husks: '',
      stones: '',
      discretion: '500'
    });
  };

  const getBadgeVariant = (isReject: boolean) => {
    return isReject ? "destructive" : "default";
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: savedAnalysis 
      ? `Analysis-${savedAnalysis.supplier_name}-${new Date().toISOString().split('T')[0]}`
      : 'Quality-Analysis'
  });

  const handleSaveClick = () => {
    if (!state.moisture) {
      toast({
        title: 'Missing Data',
        description: 'Please enter at least moisture percentage before saving',
        variant: 'destructive'
      });
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleSaveAnalysis = async () => {
    if (!supplierName.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter the supplier name',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const parseValue = (value: string): number => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      };

      const isRejected = results.rejectFinal || results.finalPrice === 'REJECT';
      const finalPriceNum = typeof results.finalPrice === 'number' ? results.finalPrice : 0;
      const outturnPriceNum = typeof results.outturnPrice === 'number' ? results.outturnPrice : 0;
      const outturnNum = typeof results.outturn === 'number' ? results.outturn : 0;

      const analysisData = {
        supplier_name: supplierName.trim(),
        coffee_type: coffeeType,
        ref_price: parseValue(state.refPrice),
        moisture: parseValue(state.moisture),
        gp1: parseValue(state.gp1),
        gp2: parseValue(state.gp2),
        less12: parseValue(state.less12),
        pods: parseValue(state.pods),
        husks: parseValue(state.husks),
        stones: parseValue(state.stones),
        discretion: parseValue(state.discretion),
        fm: results.fm,
        actual_ott: results.actualOtt,
        clean_d14: results.cleanD14,
        outturn: outturnNum,
        outturn_price: outturnPriceNum,
        final_price: finalPriceNum,
        quality_note: results.qualityNote,
        is_rejected: isRejected,
        created_by: employee?.name || 'Unknown'
      };

      const { data, error } = await supabase
        .from('quick_analyses')
        .insert(analysisData)
        .select()
        .single();

      if (error) throw error;

      setSavedAnalysis(data);
      setSaveDialogOpen(false);
      setSupplierName('');
      
      toast({
        title: 'Saved & Printing...',
        description: 'Analysis saved. Opening print preview...'
      });

      // Use requestAnimationFrame to ensure DOM is updated before printing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          handlePrint();
        });
      });

    } catch (err) {
      console.error('Error saving analysis:', err);
      toast({
        title: 'Error',
        description: 'Failed to save analysis',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingPrices) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading reference prices...</span>
      </div>
    );
  }

  // If Robusta is selected, render the dedicated Robusta calculator
  if (coffeeType === 'robusta') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Select value={coffeeType} onValueChange={(v) => setCoffeeType(v as 'arabica' | 'robusta')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabica">Arabica</SelectItem>
              <SelectItem value="robusta">Robusta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <RobustaPriceCalculator />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Arabica Price Calculator</h2>
          <Badge variant="outline">UGX</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={coffeeType} onValueChange={(v) => setCoffeeType(v as 'arabica' | 'robusta')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabica">Arabica</SelectItem>
              <SelectItem value="robusta">Robusta</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchReferencePrices} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Prices
          </Button>
          <Button onClick={resetAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSaveClick} variant="default" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save & Print
          </Button>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Quick Analysis</DialogTitle>
            <DialogDescription>
              Enter the supplier who brought this offer sample. The analysis will be saved with your name and the current date/time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                placeholder="Enter supplier name..."
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Coffee Type:</strong> {coffeeType.charAt(0).toUpperCase() + coffeeType.slice(1)}</p>
              <p><strong>Analyzed By:</strong> {employee?.name || 'Unknown'}</p>
              <p><strong>Date/Time:</strong> {new Date().toLocaleString()}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAnalysis} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Print
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden print component */}
      <div className="hidden">
        {savedAnalysis && (
          <QuickAnalysisPrint ref={printRef} analysis={savedAnalysis} />
        )}
      </div>

      {referencePrices && (
        <div className="flex flex-wrap gap-4 text-sm">
          <Badge variant="secondary">
            Arabica: UGX {(referencePrices.arabica_buying_price || referencePrices.drugar_local)?.toLocaleString()}/kg
          </Badge>
          <Badge variant="secondary">
            Robusta: UGX {(referencePrices.robusta_buying_price || referencePrices.robusta_faq_local)?.toLocaleString()}/kg
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refPrice">REF PRICE (UGX) - {coffeeType.charAt(0).toUpperCase() + coffeeType.slice(1)}</Label>
                  <Input
                    id="refPrice"
                    type="number"
                    value={state.refPrice}
                    onChange={(e) => handleInputChange('refPrice', e.target.value)}
                    step="1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="discretion">Discretion (± UGX)</Label>
                  <Input
                    id="discretion"
                    type="number"
                    value={state.discretion}
                    onChange={(e) => handleInputChange('discretion', e.target.value)}
                    step="1"
                  />
                </div>

                <div>
                  <Label htmlFor="moisture">MOISTURE (%)</Label>
                  <Input
                    id="moisture"
                    type="number"
                    value={state.moisture}
                    onChange={(e) => handleInputChange('moisture', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="gp1">GP 1 DEFECT (%)</Label>
                  <Input
                    id="gp1"
                    type="number"
                    value={state.gp1}
                    onChange={(e) => handleInputChange('gp1', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="gp2">GP 2 DEFECT (%)</Label>
                  <Input
                    id="gp2"
                    type="number"
                    value={state.gp2}
                    onChange={(e) => handleInputChange('gp2', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="less12">Less‑12 (%)</Label>
                  <Input
                    id="less12"
                    type="number"
                    value={state.less12}
                    onChange={(e) => handleInputChange('less12', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="pods">PODS (%)</Label>
                  <Input
                    id="pods"
                    type="number"
                    value={state.pods}
                    onChange={(e) => handleInputChange('pods', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="husks">HUSKS (%)</Label>
                  <Input
                    id="husks"
                    type="number"
                    value={state.husks}
                    onChange={(e) => handleInputChange('husks', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="stones">STONES (%)</Label>
                  <Input
                    id="stones"
                    type="number"
                    value={state.stones}
                    onChange={(e) => handleInputChange('stones', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Derived Values */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Derived</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">FM (Pods+Husks+Stones)</span>
                <span className="font-mono font-bold">{pct(results.fm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Actual ott</span>
                <span className="font-mono font-bold">{pct(results.actualOtt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CLEAN (D14)</span>
                <span className="font-mono font-bold">{pct(results.cleanD14)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outturn & Outturn Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Outturn & Outturn Price</CardTitle>
            <Badge variant={getBadgeVariant(results.rejectOutturnPrice)}>
              {results.rejectOutturnPrice ? 'REJECT' : 'OK'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OUTTURN</span>
              <span className="font-mono font-bold">
                {typeof results.outturn === 'string' ? results.outturn : pct(results.outturn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OUTTURN PRICE (UGX)</span>
              <span className="font-mono font-bold text-lg">
                {results.outturnPrice === null ? '—' : 
                 typeof results.outturnPrice === 'string' ? results.outturnPrice : fmt(results.outturnPrice)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              • Premium block (cap 2,000 UGX) applies with strict cleanliness; D14&gt;82 adds 50 UGX/pt inside the cap.
            </p>
          </CardContent>
        </Card>

        {/* Final Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Final Price</CardTitle>
            <Badge variant={getBadgeVariant(results.rejectFinal)}>
              {results.rejectFinal ? 'REJECT' : 'OK'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">FINAL PRICE (UGX)</span>
              <span className="font-mono font-bold text-lg">
                {results.finalPrice === null ? '—' : 
                 typeof results.finalPrice === 'string' ? results.finalPrice : fmt(results.finalPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">QUALITY NOTE</span>
              <span className="font-mono text-sm">{results.qualityNote}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              • Includes FM cash penalties (Pods 100, Husks 150, Stones 150 UGX per %).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QualityPriceCalculator;
