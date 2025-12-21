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

interface RobustaState {
  refPrice: string;
  totalWeight: string;
  moisture: string;
  g1Defects: string;
  g2Defects: string;
  less12: string;
  pods: string;
  husks: string;
  discretion: string;
}

interface RobustaResults {
  totalDefects: number;
  outturn: number;
  podsKgs: number;
  husksKgs: number;
  deductionsPods: number;
  deductionsHusks: number;
  moistureWeightLoss: number;
  totalKgsDeducted: number;
  totalDeductions: number;
  actualPrice: number;
  amountToPay: number;
}

interface SavedRobustaAnalysis {
  id: string;
  supplier_name: string;
  ref_price: number;
  total_weight: number;
  moisture: number;
  g1_defects: number;
  g2_defects: number;
  less12: number;
  total_defects: number;
  outturn: number;
  pods: number;
  husks: number;
  discretion: number;
  pods_kgs: number;
  husks_kgs: number;
  deductions_pods: number;
  deductions_husks: number;
  moisture_weight_loss: number;
  total_kgs_deducted: number;
  total_deductions: number;
  actual_price: number;
  amount_to_pay: number;
  created_by: string;
  created_at: string;
}

const RobustaPriceCalculator = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [referencePrice, setReferencePrice] = useState<number>(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState<SavedRobustaAnalysis | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const TARGET_MOISTURE = 15; // Fixed target moisture

  const [state, setState] = useState<RobustaState>({
    refPrice: '',
    totalWeight: '',
    moisture: '',
    g1Defects: '',
    g2Defects: '',
    less12: '',
    pods: '',
    husks: '',
    discretion: '0'
  });

  const [results, setResults] = useState<RobustaResults>({
    totalDefects: 0,
    outturn: 0,
    podsKgs: 0,
    husksKgs: 0,
    deductionsPods: 0,
    deductionsHusks: 0,
    moistureWeightLoss: 0,
    totalKgsDeducted: 0,
    totalDeductions: 0,
    actualPrice: 0,
    amountToPay: 0
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
    const totalWeight = parseValue(state.totalWeight);
    const moisture = parseValue(state.moisture);
    const g1Defects = parseValue(state.g1Defects);
    const g2Defects = parseValue(state.g2Defects);
    const less12 = parseValue(state.less12);
    const pods = parseValue(state.pods);
    const husks = parseValue(state.husks);
    const discretion = parseValue(state.discretion);

    // Calculate total defects and outturn
    const totalDefects = g1Defects + g2Defects + less12;
    const outturn = 100 - totalDefects;

    // Calculate pods and husks in kgs
    const podsKgs = (pods / 100) * totalWeight;
    const husksKgs = (husks / 100) * totalWeight;

    // Calculate deductions based on reference price
    const deductionsPods = podsKgs * refPrice;
    const deductionsHusks = husksKgs * refPrice;

    // Calculate moisture weight loss (using fixed target moisture of 15)
    const moistureDiff = moisture - TARGET_MOISTURE;
    const moistureWeightLoss = moistureDiff > 0 ? (moistureDiff / 100) * totalWeight : 0;

    // Total kgs deducted (pods + husks + moisture loss)
    const totalKgsDeducted = podsKgs + husksKgs + moistureWeightLoss;

    // Total deductions in UGX
    const totalDeductions = deductionsPods + deductionsHusks + (moistureWeightLoss * refPrice) + discretion;

    // Actual price per kg after deductions
    const effectiveWeight = totalWeight - totalKgsDeducted;
    const actualPrice = effectiveWeight > 0 ? refPrice - (totalDeductions / effectiveWeight) : 0;

    // Amount to pay
    const amountToPay = (totalWeight - totalKgsDeducted) * refPrice - discretion;

    setResults({
      totalDefects,
      outturn,
      podsKgs,
      husksKgs,
      deductionsPods,
      deductionsHusks,
      moistureWeightLoss,
      totalKgsDeducted,
      totalDeductions,
      actualPrice: Math.max(0, actualPrice),
      amountToPay: Math.max(0, amountToPay)
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
      totalWeight: '',
      moisture: '',
      g1Defects: '',
      g2Defects: '',
      less12: '',
      pods: '',
      husks: '',
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
    if (!state.totalWeight || !state.moisture) {
      toast({
        title: 'Missing Data',
        description: 'Please enter at least total weight and moisture percentage before saving',
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
        gp1: 0,
        gp2: 0,
        less12: 0,
        pods: parseValue(state.pods),
        husks: parseValue(state.husks),
        stones: 0,
        discretion: parseValue(state.discretion),
        fm: parseValue(state.pods) + parseValue(state.husks),
        actual_ott: 0,
        clean_d14: 0,
        outturn: 0,
        outturn_price: 0,
        final_price: results.actualPrice,
        quality_note: `Total Weight: ${state.totalWeight}kg, Amount to Pay: UGX ${fmtCurrency(results.amountToPay)}`,
        is_rejected: false,
        created_by: employee?.name || 'Unknown',
        // Store robusta-specific data in a JSON field or notes
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
        total_weight: parseValue(state.totalWeight),
        moisture: parseValue(state.moisture),
        g1_defects: parseValue(state.g1Defects),
        g2_defects: parseValue(state.g2Defects),
        less12: parseValue(state.less12),
        total_defects: results.totalDefects,
        outturn: results.outturn,
        pods: parseValue(state.pods),
        husks: parseValue(state.husks),
        discretion: parseValue(state.discretion),
        pods_kgs: results.podsKgs,
        husks_kgs: results.husksKgs,
        deductions_pods: results.deductionsPods,
        deductions_husks: results.deductionsHusks,
        moisture_weight_loss: results.moistureWeightLoss,
        total_kgs_deducted: results.totalKgsDeducted,
        total_deductions: results.totalDeductions,
        actual_price: results.actualPrice,
        amount_to_pay: results.amountToPay,
        created_by: employee?.name || 'Unknown',
        created_at: new Date().toISOString()
      };

      setSavedAnalysis(printData);
      setSaveDialogOpen(false);
      setSupplierName('');

      toast({
        title: 'Saved',
        description: 'Robusta analysis saved successfully. Printing...'
      });

      setTimeout(() => {
        handlePrint();
      }, 100);

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
          <RobustaPrint ref={printRef} analysis={savedAnalysis} />
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
                <Label className="text-xs">Total Weight (kg)</Label>
                <Input
                  type="number"
                  value={state.totalWeight}
                  onChange={(e) => handleInputChange('totalWeight', e.target.value)}
                  placeholder="e.g. 70"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div>
              <Label className="text-xs">Discretion (UGX)</Label>
              <Input
                type="number"
                value={state.discretion}
                onChange={(e) => handleInputChange('discretion', e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Derived Values */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Calculated Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Defects & Outturn Section */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                <span className="text-muted-foreground text-xs">Total Defects</span>
                <p className="font-medium text-amber-700 dark:text-amber-400">{fmt(results.totalDefects)}%</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
                <span className="text-muted-foreground text-xs">Outturn (100 - Defects)</span>
                <p className="font-bold text-green-700 dark:text-green-400">{fmt(results.outturn)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Pods (kg)</span>
                <p className="font-medium">{fmt(results.podsKgs)}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Husks (kg)</span>
                <p className="font-medium">{fmt(results.husksKgs)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Deductions Pods (UGX)</span>
                <p className="font-medium">{fmtCurrency(results.deductionsPods)}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Deductions Husks (UGX)</span>
                <p className="font-medium">{fmtCurrency(results.deductionsHusks)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Moisture Loss (kg)</span>
                <p className="font-medium">{fmt(results.moistureWeightLoss)}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <span className="text-muted-foreground text-xs">Total Kgs Deducted</span>
                <p className="font-medium">{fmt(results.totalKgsDeducted)}</p>
              </div>
            </div>

            <div className="p-2 bg-muted rounded text-sm">
              <span className="text-muted-foreground text-xs">Total Deductions (UGX)</span>
              <p className="font-medium">{fmtCurrency(results.totalDeductions)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Results */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Final Calculation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <span className="text-sm text-muted-foreground">Actual Price (UGX/kg)</span>
              <p className="text-2xl font-bold text-primary">{fmtCurrency(results.actualPrice)}</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <span className="text-sm text-muted-foreground">Amount To Pay (UGX)</span>
              <p className="text-2xl font-bold text-green-600">{fmtCurrency(results.amountToPay)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RobustaPriceCalculator;
