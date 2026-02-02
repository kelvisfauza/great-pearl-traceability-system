import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useReactToPrint } from 'react-to-print';
import RobustaPrint from './RobustaPrint';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';

interface RobustaState {
  refPrice: string;
  moisture: string;
  g1Defects: string;
  g2Defects: string;
  less12: string;
  pods: string;
  husks: string;
  stones: string;
  discretion: string;
}

interface RobustaResults {
  totalDefects: number;
  outturn: number;
  totalFM: number;
  isRejected: boolean;
  moistureDeductionPercent: number;
  totalDeductionPercent: number;
  deductionPerKg: number;
  actualPricePerKg: number;
}

interface SavedRobustaAnalysis {
  id: string;
  supplier_name: string;
  ref_price: number;
  moisture: number;
  g1_defects: number;
  g2_defects: number;
  less12: number;
  total_defects: number;
  outturn: number;
  pods: number;
  husks: number;
  stones: number;
  discretion: number;
  total_fm: number;
  is_rejected: boolean;
  moisture_deduction_percent: number;
  total_deduction_percent: number;
  deduction_per_kg: number;
  actual_price_per_kg: number;
  created_by: string;
  created_at: string;
}

const RobustaPriceCalculator = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const { createVerification } = useDocumentVerification();
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedRobustaAnalysis | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const TARGET_MOISTURE = 15; // Fixed target moisture
  const FM_REJECTION_THRESHOLD = 6; // FM above 6% = rejection

  const [state, setState] = useState<RobustaState>({
    refPrice: '',
    moisture: '',
    g1Defects: '',
    g2Defects: '',
    less12: '',
    pods: '',
    husks: '',
    stones: '',
    discretion: '0'
  });

  const [results, setResults] = useState<RobustaResults>({
    totalDefects: 0,
    outturn: 0,
    totalFM: 0,
    isRejected: false,
    moistureDeductionPercent: 0,
    totalDeductionPercent: 0,
    deductionPerKg: 0,
    actualPricePerKg: 0
  });

  const fetchReferencePrices = async () => {
    setLoadingPrices(true);
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('robusta_buying_price, robusta_faq_local')
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
        const price = data.robusta_buying_price || data.robusta_faq_local || 0;
        setReferencePrice(price);
        setState(prev => ({ ...prev, refPrice: price.toString() }));
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

  const parseValue = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculate = () => {
    const refPrice = parseValue(state.refPrice);
    const moisture = parseValue(state.moisture);
    const g1Defects = parseValue(state.g1Defects);
    const g2Defects = parseValue(state.g2Defects);
    const less12 = parseValue(state.less12);
    const pods = parseValue(state.pods);
    const husks = parseValue(state.husks);
    const stones = parseValue(state.stones);
    const discretion = parseValue(state.discretion);

    // Calculate total FM (pods + husks + stones)
    const totalFM = pods + husks + stones;
    const isRejected = totalFM > FM_REJECTION_THRESHOLD;

    // Calculate total defects and outturn (G1, G2, Less12, and FM affect outturn)
    const totalDefects = g1Defects + g2Defects + less12 + totalFM;
    const outturn = 100 - totalDefects;

    // Calculate moisture deduction percentage (using fixed target moisture of 15)
    const moistureDiff = moisture - TARGET_MOISTURE;
    const moistureDeductionPercent = moistureDiff > 0 ? moistureDiff : 0;

    // Total deduction percentage (less12 + pods + husks + stones + moisture affect price)
    // Less 12 has equal deductions as pods (affects both outturn AND price)
    const totalDeductionPercent = less12 + totalFM + moistureDeductionPercent;

    // Deduction per kg = refPrice × totalDeductionPercent / 100
    const deductionPerKg = (refPrice * totalDeductionPercent) / 100 + discretion;

    // Actual price per kg = refPrice - deduction per kg
    const actualPricePerKg = refPrice - deductionPerKg;

    setResults({
      totalDefects,
      outturn,
      totalFM,
      isRejected,
      moistureDeductionPercent,
      totalDeductionPercent,
      deductionPerKg,
      actualPricePerKg: Math.max(0, actualPricePerKg)
    });
  };

  useEffect(() => {
    calculate();
  }, [state]);

  const handleInputChange = (field: keyof RobustaState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setState({
      refPrice: referencePrice.toString(),
      moisture: '',
      g1Defects: '',
      g2Defects: '',
      less12: '',
      pods: '',
      husks: '',
      stones: '',
      discretion: '0'
    });
  };

  const fmt = (n: number) => isFinite(n) ? n.toLocaleString('en-UG', { maximumFractionDigits: 1 }) : '—';
  const fmtCurrency = (n: number) => isFinite(n) ? n.toLocaleString('en-UG', { maximumFractionDigits: 0 }) : '—';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: savedAnalysis
      ? `Robusta-Analysis-${savedAnalysis.supplier_name}-${new Date().toISOString().split('T')[0]}`
      : 'Robusta-Analysis'
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
      const analysisData = {
        supplier_name: supplierName.trim(),
        coffee_type: 'robusta',
        ref_price: parseValue(state.refPrice),
        moisture: parseValue(state.moisture),
        gp1: parseValue(state.g1Defects),
        gp2: parseValue(state.g2Defects),
        less12: parseValue(state.less12),
        pods: parseValue(state.pods),
        husks: parseValue(state.husks),
        stones: parseValue(state.stones),
        discretion: parseValue(state.discretion),
        fm: results.totalFM,
        actual_ott: results.outturn,
        clean_d14: 0,
        outturn: results.outturn,
        outturn_price: 0,
        final_price: results.actualPricePerKg,
        quality_note: results.isRejected 
          ? `REJECTED: FM ${fmt(results.totalFM)}% exceeds 6% threshold`
          : `Deduction/kg: UGX ${fmtCurrency(results.deductionPerKg)}, Total Deduction: ${fmt(results.totalDeductionPercent)}%`,
        is_rejected: results.isRejected,
        created_by: employee?.name || 'Unknown',
      };

      const { data, error } = await supabase
        .from('quick_analyses')
        .insert(analysisData)
        .select()
        .single();

      if (error) throw error;

      // Create a proper saved analysis object for printing
      const printData: SavedRobustaAnalysis = {
        id: data.id,
        supplier_name: supplierName.trim(),
        ref_price: parseValue(state.refPrice),
        moisture: parseValue(state.moisture),
        g1_defects: parseValue(state.g1Defects),
        g2_defects: parseValue(state.g2Defects),
        less12: parseValue(state.less12),
        total_defects: results.totalDefects,
        outturn: results.outturn,
        pods: parseValue(state.pods),
        husks: parseValue(state.husks),
        stones: parseValue(state.stones),
        discretion: parseValue(state.discretion),
        total_fm: results.totalFM,
        is_rejected: results.isRejected,
        moisture_deduction_percent: results.moistureDeductionPercent,
        total_deduction_percent: results.totalDeductionPercent,
        deduction_per_kg: results.deductionPerKg,
        actual_price_per_kg: results.actualPricePerKg,
        created_by: employee?.name || 'Unknown',
        created_at: new Date().toISOString()
      };

      setSavedAnalysis(printData);
      setSaveDialogOpen(false);
      setSupplierName('');

      // Generate verification code for printing
      const code = await createVerification({
        type: 'assessment',
        subtype: 'Robusta Quality Analysis',
        issued_to_name: supplierName.trim(),
        reference_no: data.id,
        meta: {
          coffeeType: 'robusta',
          actualPrice: results.actualPricePerKg,
          isRejected: results.isRejected
        }
      });
      setVerificationCode(code);

      toast({
        title: 'Saved & Printing...',
        description: 'Robusta analysis saved. Opening print preview...'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Robusta Price Calculator</h2>
          <Badge variant="outline">UGX</Badge>
        </div>
        <div className="flex items-center gap-2">
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
            <DialogTitle>Save Robusta Analysis</DialogTitle>
            <DialogDescription>
              Enter the supplier who brought this offer sample.
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
              <p><strong>Coffee Type:</strong> Robusta</p>
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
          <RobustaPrint ref={printRef} analysis={savedAnalysis} verificationCode={verificationCode} />
        )}
      </div>

      <Badge variant="secondary">
        Robusta Reference Price: UGX {fmtCurrency(referencePrice)}/kg
      </Badge>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Reference Price (UGX/kg)</Label>
                <Input
                  type="number"
                  value={state.refPrice}
                  onChange={(e) => handleInputChange('refPrice', e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Moisture Content (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.moisture}
                  onChange={(e) => handleInputChange('moisture', e.target.value)}
                  placeholder="e.g. 19"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">G1 Defects (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.g1Defects}
                  onChange={(e) => handleInputChange('g1Defects', e.target.value)}
                  placeholder="e.g. 2"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">G2 Defects (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.g2Defects}
                  onChange={(e) => handleInputChange('g2Defects', e.target.value)}
                  placeholder="e.g. 1"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Less 12 (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.less12}
                  onChange={(e) => handleInputChange('less12', e.target.value)}
                  placeholder="e.g. 0.5"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Discretion (UGX/kg)</Label>
                <Input
                  type="number"
                  value={state.discretion}
                  onChange={(e) => handleInputChange('discretion', e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Pods (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.pods}
                  onChange={(e) => handleInputChange('pods', e.target.value)}
                  placeholder="e.g. 0.8"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Husks (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.husks}
                  onChange={(e) => handleInputChange('husks', e.target.value)}
                  placeholder="e.g. 0.7"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Stones (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={state.stones}
                  onChange={(e) => handleInputChange('stones', e.target.value)}
                  placeholder="e.g. 0.5"
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Derived Values */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Calculated Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* FM & Rejection Status */}
            <div className={`p-3 rounded border ${results.isRejected 
              ? 'bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-700' 
              : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-xs">Total FM (Pods+Husks+Stones)</span>
                  <p className={`font-bold text-lg ${results.isRejected ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {fmt(results.totalFM)}%
                  </p>
                </div>
                <Badge variant={results.isRejected ? "destructive" : "default"} className="text-sm">
                  {results.isRejected ? "REJECTED" : "ACCEPTED"}
                </Badge>
              </div>
              {results.isRejected && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  FM exceeds 6% threshold
                </p>
              )}
            </div>

            {/* Defects & Outturn Section */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                <span className="text-muted-foreground text-xs">Total Defects (G1+G2+Less12)</span>
                <p className="font-medium text-amber-700 dark:text-amber-400">{fmt(results.totalDefects)}%</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
                <span className="text-muted-foreground text-xs">Outturn (100 - Defects)</span>
                <p className="font-bold text-green-700 dark:text-green-400">{fmt(results.outturn)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Moisture Deduction</span>
                <p className="font-medium">{fmt(results.moistureDeductionPercent)}%</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Total Price Deduction</span>
                <p className="font-medium">{fmt(results.totalDeductionPercent)}%</p>
              </div>
            </div>

            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-sm">
              <span className="text-muted-foreground text-xs">Deduction per kg (UGX)</span>
              <p className="font-bold text-red-600 dark:text-red-400 text-lg">{fmtCurrency(results.deductionPerKg)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Results */}
      <Card className={`border-2 ${results.isRejected ? 'border-red-400 dark:border-red-700' : 'border-primary/20'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Final Price
            {results.isRejected && (
              <Badge variant="destructive" className="text-sm">SAMPLE REJECTED</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg text-center ${results.isRejected ? 'bg-red-100 dark:bg-red-950/50' : 'bg-green-500/10'}`}>
            <span className="text-sm text-muted-foreground">
              {results.isRejected ? 'Price (if accepted)' : 'Actual Price per kg (UGX)'}
            </span>
            <p className={`text-3xl font-bold ${results.isRejected ? 'text-red-600 line-through' : 'text-green-600'}`}>
              {fmtCurrency(results.actualPricePerKg)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Reference: {fmtCurrency(parseValue(state.refPrice))} - Deduction: {fmtCurrency(results.deductionPerKg)}
            </p>
            {results.isRejected && (
              <p className="text-sm font-medium text-red-600 mt-2">
                FM {fmt(results.totalFM)}% exceeds 6% maximum threshold
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RobustaPriceCalculator;
