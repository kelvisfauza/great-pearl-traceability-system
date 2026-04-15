import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, XCircle, Calculator, Loader2, Coffee, Package, User, Beaker } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import GRNPrintModal from '@/components/quality/GRNPrintModal';

interface PendingAssessment {
  id: string;
  batch_number: string;
  assessed_by: string;
  date_assessed: string;
  moisture: number;
  group1_defects: number | null;
  group2_defects: number | null;
  pods: number | null;
  husks: number | null;
  fm: number | null;
  outturn: number | null;
  suggested_price: number;
  comments: string | null;
  store_record_id: string | null;
  coffee_record?: {
    id: string;
    supplier_name: string;
    coffee_type: string;
    kilograms: number;
    bags: number;
    supplier_id: string | null;
  };
}

interface AdminCalculatorInputs {
  refPrice: string;
  moisture: string;
  gp1: string;
  gp2: string;
  less12: string;
  pods: string;
  husks: string;
  stones: string;
  robustaInArabica: string;
  discretion: string;
}

interface AdminCalculatorResults {
  finalPrice: number | null;
  outturnPrice: number | null;
  outturn: number | null;
  cleanD14: number | null;
  fm: number;
  rejectFinal: boolean;
  note: string;
}

const defaultCalculatorInputs: AdminCalculatorInputs = {
  refPrice: '',
  moisture: '',
  gp1: '',
  gp2: '',
  less12: '0',
  pods: '0',
  husks: '0',
  stones: '0',
  robustaInArabica: '0',
  discretion: '0',
};

const parseInputNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildCalculatorInputs = (assessment: PendingAssessment, refPrice?: number): AdminCalculatorInputs => {
  const pods = assessment.pods ?? 0;
  const husks = assessment.husks ?? 0;
  const fm = assessment.fm ?? 0;
  const derivedStones = Math.max(0, fm - pods - husks);
  const isArabica = assessment.coffee_record?.coffee_type?.toLowerCase().includes('arabica');

  return {
    refPrice: refPrice ? String(refPrice) : '',
    moisture: String(assessment.moisture ?? ''),
    gp1: String(assessment.group1_defects ?? 0),
    gp2: String(assessment.group2_defects ?? 0),
    less12: '0',
    pods: String(pods),
    husks: String(husks),
    stones: String(derivedStones),
    robustaInArabica: '0',
    discretion: isArabica ? '500' : '0',
  };
};

const calculateAdminPrice = (
  inputs: AdminCalculatorInputs,
  coffeeType?: string,
): AdminCalculatorResults => {
  const refPrice = parseInputNumber(inputs.refPrice);
  const moisture = parseInputNumber(inputs.moisture);
  const gp1 = parseInputNumber(inputs.gp1);
  const gp2 = parseInputNumber(inputs.gp2);
  const less12 = parseInputNumber(inputs.less12);
  const pods = parseInputNumber(inputs.pods);
  const husks = parseInputNumber(inputs.husks);
  const stones = parseInputNumber(inputs.stones);
  const robustaInArabica = parseInputNumber(inputs.robustaInArabica);
  const discretion = parseInputNumber(inputs.discretion);
  const totalFm = pods + husks + stones;
  const isArabica = coffeeType?.toLowerCase().includes('arabica');

  if (!refPrice) {
    return {
      finalPrice: null,
      outturnPrice: null,
      outturn: null,
      cleanD14: null,
      fm: totalFm,
      rejectFinal: false,
      note: 'Add a reference price to calculate the final price.',
    };
  }

  if (!isArabica) {
    const totalDefects = gp1 + gp2 + less12 + totalFm;
    const outturn = 100 - totalDefects;
    const moistureDeductionPercent = Math.max(0, moisture - 15);
    const totalDeductionPercent = less12 + totalFm + moistureDeductionPercent;
    const deductionPerKg = (refPrice * totalDeductionPercent) / 100 + discretion;
    const actualPricePerKg = Math.max(0, refPrice - deductionPerKg);
    const isRejected = totalFm > 6;

    return {
      finalPrice: isRejected ? null : actualPricePerKg,
      outturnPrice: null,
      outturn,
      cleanD14: null,
      fm: totalFm,
      rejectFinal: isRejected,
      note: isRejected
        ? `Rejected: Foreign matter ${totalFm.toFixed(1)}% exceeds 6%.`
        : `Deduction/kg: UGX ${Math.round(deductionPerKg).toLocaleString('en-UG')}`,
    };
  }

  const over = (value: number, limit: number) => Math.max(0, value - limit);
  const cleanD14 =
    100 -
    over(moisture, 14) -
    over(gp1, 4) -
    over(gp2, 10) -
    over(less12, 1) -
    robustaInArabica;

  const outturnRejected = less12 > 3 || robustaInArabica > 3 || gp1 > 12;
  const outturn = outturnRejected
    ? null
    : 100 -
      over(moisture, 14) -
      over(gp1, 4) -
      over(gp2, 10) -
      pods -
      husks -
      stones -
      over(less12, 1) -
      robustaInArabica;

  const moistPenalty = moisture >= 14 ? over(moisture, 14) * refPrice * 0.02 : 0;
  const gp1Penalty = over(gp1, 4) * 50;
  const gp2Penalty = over(gp2, 10) * 20;
  const d14LowPenalty = cleanD14 < 78 ? (78 - cleanD14) * 50 : 0;
  const d14HighBonus = cleanD14 > 82 ? (cleanD14 - 82) * 50 : 0;
  const rejectFinal = moisture > 16.5 || gp1 > 12 || gp2 > 25 || less12 > 3 || totalFm > 6 || pods > 6 || husks > 6 || stones > 6 || robustaInArabica > 3;

  const outturnPrice = rejectFinal
    ? null
    : refPrice +
      Math.min(((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && robustaInArabica === 0) ? 2000 : 0) + d14HighBonus, 2000) -
      moistPenalty -
      gp1Penalty -
      gp2Penalty -
      d14LowPenalty +
      d14HighBonus -
      over(less12, 1) * 30 -
      robustaInArabica * 100 +
      discretion;

  const finalPrice = rejectFinal
    ? null
    : refPrice +
      Math.min(((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0 && robustaInArabica === 0) ? 2000 : 0) + d14HighBonus, 2000) -
      moistPenalty -
      gp1Penalty -
      gp2Penalty -
      d14LowPenalty +
      d14HighBonus -
      (pods * 100 + husks * 150 + stones * 150) -
      over(less12, 1) * 40 -
      robustaInArabica * 100 +
      discretion;

  let note = 'Standard/Penalty Price Applied';
  if (robustaInArabica > 3) note = `Rejected: Robusta in Arabica exceeds 3% (${robustaInArabica.toFixed(1)}%).`;
  else if (gp1 > 12) note = `Rejected: GP1 defects exceed 12% (${gp1.toFixed(1)}%).`;
  else if (rejectFinal) note = 'Rejected by quality thresholds.';
  else if (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0 && robustaInArabica === 0) note = 'Bonus: Premium Price Applied';

  return {
    finalPrice,
    outturnPrice,
    outturn,
    cleanD14,
    fm: totalFm,
    rejectFinal,
    note,
  };
};

const AdminQualityPricingReview = () => {
  const [assessments, setAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<PendingAssessment | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [adminComments, setAdminComments] = useState('');
  const [calculatorPrice, setCalculatorPrice] = useState<number | null>(null);
  const [calculatorInputs, setCalculatorInputs] = useState<AdminCalculatorInputs>(defaultCalculatorInputs);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnData, setGrnData] = useState<any>(null);
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchPendingAssessments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .eq('status', 'pending_admin_pricing')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch coffee records for each assessment
      const enriched: PendingAssessment[] = [];
      for (const assessment of (data || [])) {
        let coffee_record = undefined;
        if (assessment.store_record_id) {
          const { data: record } = await supabase
            .from('coffee_records')
            .select('id, supplier_name, coffee_type, kilograms, bags, supplier_id')
            .eq('id', assessment.store_record_id)
            .single();
          coffee_record = record || undefined;
        }
        enriched.push({ ...assessment, coffee_record } as PendingAssessment);
      }
      setAssessments(enriched);
    } catch (error) {
      console.error('Error fetching pending assessments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current calculator/market price
  const fetchCalculatorPrice = useCallback(async (coffeeType: string) => {
    try {
      const { data } = await supabase
        .from('market_prices')
        .select('arabica_buying_price, robusta_buying_price')
        .eq('price_type', 'reference_prices')
        .single();

      if (data) {
        const isArabica = coffeeType?.toLowerCase().includes('arabica');
        setCalculatorPrice(isArabica ? data.arabica_buying_price : data.robusta_buying_price);
      }
    } catch (error) {
      console.error('Error fetching calculator price:', error);
    }
  }, []);

  useEffect(() => {
    fetchPendingAssessments();
    const channel = supabase
      .channel('admin_quality_pricing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_assessments' }, () => {
        fetchPendingAssessments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPendingAssessments]);

  const openReview = (assessment: PendingAssessment) => {
    const startingCalculatorPrice = assessment.coffee_record?.coffee_type
      ? calculatorPrice ?? undefined
      : undefined;

    setSelectedAssessment(assessment);
    setFinalPrice(assessment.suggested_price);
    setAdminComments('');
    setCalculatorPrice(null);
    setCalculatorInputs(buildCalculatorInputs(assessment, startingCalculatorPrice));
    setReviewModalOpen(true);
    if (assessment.coffee_record?.coffee_type) {
      fetchCalculatorPrice(assessment.coffee_record.coffee_type);
    }
  };

  const adminCalculation = useMemo(
    () => calculateAdminPrice(calculatorInputs, selectedAssessment?.coffee_record?.coffee_type),
    [calculatorInputs, selectedAssessment?.coffee_record?.coffee_type],
  );

  useEffect(() => {
    if (selectedAssessment && calculatorPrice) {
      setCalculatorInputs((prev) => ({ ...prev, refPrice: String(calculatorPrice) }));
    }
  }, [calculatorPrice, selectedAssessment]);

  const handleApproveWithPrice = async () => {
    if (!selectedAssessment || !finalPrice) return;
    setProcessingId(selectedAssessment.id);
    try {
      // 1. Update quality assessment
      const { error: updateError } = await supabase
        .from('quality_assessments')
        .update({
          final_price: finalPrice,
          status: 'approved',
          quality_note: adminComments || null
        })
        .eq('id', selectedAssessment.id);
      if (updateError) throw updateError;

      // 2. Update coffee record to inventory
      if (selectedAssessment.store_record_id) {
        const { error: recordError } = await supabase
          .from('coffee_records')
          .update({ status: 'inventory' })
          .eq('id', selectedAssessment.store_record_id);
        if (recordError) throw recordError;
      }

      // 3. Create finance_coffee_lots entry
      if (selectedAssessment.store_record_id && selectedAssessment.coffee_record) {
        const qualityJson = {
          moisture_content: selectedAssessment.moisture,
          group1_percentage: selectedAssessment.group1_defects,
          group2_percentage: selectedAssessment.group2_defects,
          pods_percentage: selectedAssessment.pods,
          husks_percentage: selectedAssessment.husks,
          fm_percentage: selectedAssessment.fm,
          outturn_percentage: selectedAssessment.outturn,
          comments: selectedAssessment.comments
        };

        await supabase
          .from('finance_coffee_lots')
          .insert({
            quality_assessment_id: selectedAssessment.id,
            coffee_record_id: selectedAssessment.store_record_id,
            supplier_id: selectedAssessment.coffee_record.supplier_id,
            assessed_by: selectedAssessment.assessed_by,
            assessed_at: new Date().toISOString(),
            quality_json: qualityJson,
            unit_price_ugx: finalPrice,
            quantity_kg: selectedAssessment.coffee_record.kilograms,
            finance_status: 'READY_FOR_FINANCE'
          });
      }

      // Prepare GRN
      if (selectedAssessment.coffee_record) {
        const grnInfo = {
          grnNumber: `GRN-${selectedAssessment.batch_number}`,
          supplierName: selectedAssessment.coffee_record.supplier_name,
          coffeeType: selectedAssessment.coffee_record.coffee_type,
          qualityAssessment: 'Approved',
          numberOfBags: selectedAssessment.coffee_record.bags,
          totalKgs: selectedAssessment.coffee_record.kilograms,
          unitPrice: finalPrice,
          assessedBy: selectedAssessment.assessed_by,
          createdAt: new Date().toISOString(),
          moisture: selectedAssessment.moisture,
          group1_defects: selectedAssessment.group1_defects,
          group2_defects: selectedAssessment.group2_defects,
          pods: selectedAssessment.pods,
          husks: selectedAssessment.husks,
          stones: selectedAssessment.fm,
          outturn: selectedAssessment.outturn || undefined,
          calculatorComments: selectedAssessment.comments || undefined
        };
        setGrnData(grnInfo);
        setShowGRNModal(true);
      }

      toast({ title: "Pricing Approved", description: `Lot ${selectedAssessment.batch_number} approved at UGX ${finalPrice.toLocaleString()}/kg` });
      setReviewModalOpen(false);
      fetchPendingAssessments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedAssessment) return;
    if (!adminComments) {
      toast({ title: "Comments Required", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }
    setProcessingId(selectedAssessment.id);
    // Use either the admin-set final price or the calculator result
    const effectivePrice = finalPrice || adminCalculation.finalPrice || 0;
    try {
      const { error: updateError } = await supabase
        .from('quality_assessments')
        .update({
          status: 'rejected',
          quality_note: adminComments,
          reject_final: true,
          final_price: effectivePrice > 0 ? effectivePrice : undefined
        })
        .eq('id', selectedAssessment.id);
      if (updateError) throw updateError;

      if (selectedAssessment.store_record_id) {
        await supabase
          .from('coffee_records')
          .update({ status: 'QUALITY_REJECTED' })
          .eq('id', selectedAssessment.store_record_id);
      }

      // If admin set a price before rejecting, still create finance lot for payment
      if (effectivePrice > 0 && selectedAssessment.store_record_id && selectedAssessment.coffee_record) {
        const qualityJson = {
          moisture_content: selectedAssessment.moisture,
          group1_percentage: selectedAssessment.group1_defects,
          group2_percentage: selectedAssessment.group2_defects,
          pods_percentage: selectedAssessment.pods,
          husks_percentage: selectedAssessment.husks,
          fm_percentage: selectedAssessment.fm,
          outturn_percentage: selectedAssessment.outturn,
          comments: `QUALITY REJECTED - ${adminComments}`
        };

        await supabase
          .from('finance_coffee_lots')
          .insert({
            quality_assessment_id: selectedAssessment.id,
            coffee_record_id: selectedAssessment.store_record_id,
            supplier_id: selectedAssessment.coffee_record.supplier_id,
            assessed_by: selectedAssessment.assessed_by,
            assessed_at: new Date().toISOString(),
            quality_json: qualityJson,
            unit_price_ugx: effectivePrice,
            quantity_kg: selectedAssessment.coffee_record.kilograms,
            finance_status: 'READY_FOR_FINANCE'
          });

        toast({ 
          title: "Quality Rejected - Sent to Finance", 
          description: `Lot ${selectedAssessment.batch_number} rejected but priced at UGX ${finalPrice.toLocaleString()}/kg — sent to Finance for payment` 
        });
      } else {
        toast({ title: "Assessment Rejected", description: `Lot ${selectedAssessment.batch_number} has been rejected` });
      }

      setReviewModalOpen(false);
      fetchPendingAssessments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (value: number) => `UGX ${new Intl.NumberFormat('en-UG').format(value)}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            <CardTitle>Quality Assessments - Pending Pricing</CardTitle>
          </div>
          <CardDescription>
            Review quality assessments and set final buying prices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Coffee className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No assessments pending pricing</p>
              <p className="text-sm">Quality assessments awaiting your pricing decision will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{assessment.batch_number}</span>
                      <Badge variant="outline">
                        {assessment.coffee_record?.coffee_type || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {assessment.coffee_record?.supplier_name || 'Unknown'}
                      </span>
                      <span>{assessment.coffee_record?.kilograms?.toLocaleString()} kg</span>
                      <span>{assessment.coffee_record?.bags} bags</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span>Suggested: <strong className="text-primary">{formatCurrency(assessment.suggested_price)}/kg</strong></span>
                      <span className="text-muted-foreground">Assessed by: {assessment.assessed_by}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openReview(assessment)}>
                    Review & Price
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
            <DialogTitle>Review Quality Assessment - {selectedAssessment?.batch_number}</DialogTitle>
          </DialogHeader>

          {selectedAssessment && (
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-4">
                {/* Lot Info */}
                <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2">
                  <div><span className="text-muted-foreground">Supplier:</span> <strong>{selectedAssessment.coffee_record?.supplier_name}</strong></div>
                  <div><span className="text-muted-foreground">Coffee Type:</span> <strong>{selectedAssessment.coffee_record?.coffee_type}</strong></div>
                  <div><span className="text-muted-foreground">Quantity:</span> <strong>{selectedAssessment.coffee_record?.kilograms?.toLocaleString()} kg</strong></div>
                  <div><span className="text-muted-foreground">Bags:</span> <strong>{selectedAssessment.coffee_record?.bags}</strong></div>
                  <div><span className="text-muted-foreground">Assessed By:</span> <strong>{selectedAssessment.assessed_by}</strong></div>
                  <div><span className="text-muted-foreground">Date:</span> <strong>{selectedAssessment.date_assessed}</strong></div>
                </div>

                {/* Quality Parameters */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Quality Parameters</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Moisture</div>
                      <div className="font-bold">{selectedAssessment.moisture}%</div>
                    </div>
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Outturn</div>
                      <div className="font-bold">{selectedAssessment.outturn ?? '-'}%</div>
                    </div>
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Group 1</div>
                      <div className="font-bold">{selectedAssessment.group1_defects ?? 0}%</div>
                    </div>
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Group 2</div>
                      <div className="font-bold">{selectedAssessment.group2_defects ?? 0}%</div>
                    </div>
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Pods</div>
                      <div className="font-bold">{selectedAssessment.pods ?? 0}%</div>
                    </div>
                    <div className="rounded border p-2 text-center">
                      <div className="text-xs text-muted-foreground">Husks</div>
                      <div className="font-bold">{selectedAssessment.husks ?? 0}%</div>
                    </div>
                    <div className="rounded border p-2 text-center sm:col-span-3 md:col-span-1">
                      <div className="text-xs text-muted-foreground">Foreign Matter</div>
                      <div className="font-bold">{selectedAssessment.fm ?? 0}%</div>
                    </div>
                  </div>
                </div>

                {selectedAssessment.comments && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <span className="text-muted-foreground">Quality Notes:</span> {selectedAssessment.comments}
                  </div>
                )}

                <div className="space-y-4 border-t pt-4">
                  <h4 className="text-sm font-semibold">Pricing Decision</h4>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">Suggested Price (Quality Team)</div>
                      <div className="text-lg font-bold break-words">{formatCurrency(selectedAssessment.suggested_price)}/kg</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => setFinalPrice(selectedAssessment.suggested_price)}
                      >
                        Use Suggested Price
                      </Button>
                    </div>

                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="mb-1 text-xs text-muted-foreground">Market Reference Price</div>
                      <div className="text-lg font-bold break-words">
                        {calculatorPrice ? `${formatCurrency(calculatorPrice)}/kg` : 'Loading...'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => calculatorPrice && setCalculatorInputs((prev) => ({ ...prev, refPrice: String(calculatorPrice) }))}
                        disabled={!calculatorPrice}
                      >
                        <Calculator className="mr-1 h-3 w-3" />
                        Use Market Reference
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h5 className="font-medium">Admin Calculator</h5>
                        <p className="text-sm text-muted-foreground">Adjust inputs and apply the computed final price.</p>
                      </div>
                      <Badge variant={adminCalculation.rejectFinal ? 'destructive' : 'outline'} className="w-fit">
                        {selectedAssessment.coffee_record?.coffee_type || 'Coffee'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <Label htmlFor="admin_ref_price">Reference Price (UGX/kg)</Label>
                        <Input id="admin_ref_price" type="number" value={calculatorInputs.refPrice} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, refPrice: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_discretion">Discretion (UGX/kg)</Label>
                        <Input id="admin_discretion" type="number" value={calculatorInputs.discretion} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, discretion: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_moisture">Moisture (%)</Label>
                        <Input id="admin_moisture" type="number" step="0.1" value={calculatorInputs.moisture} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, moisture: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_gp1">Group 1 (%)</Label>
                        <Input id="admin_gp1" type="number" step="0.1" value={calculatorInputs.gp1} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, gp1: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_gp2">Group 2 (%)</Label>
                        <Input id="admin_gp2" type="number" step="0.1" value={calculatorInputs.gp2} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, gp2: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_less12">Less 12 (%)</Label>
                        <Input id="admin_less12" type="number" step="0.1" value={calculatorInputs.less12} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, less12: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_pods">Pods (%)</Label>
                        <Input id="admin_pods" type="number" step="0.1" value={calculatorInputs.pods} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, pods: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_husks">Husks (%)</Label>
                        <Input id="admin_husks" type="number" step="0.1" value={calculatorInputs.husks} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, husks: e.target.value }))} />
                      </div>
                      <div>
                        <Label htmlFor="admin_stones">Stones (%)</Label>
                        <Input id="admin_stones" type="number" step="0.1" value={calculatorInputs.stones} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, stones: e.target.value }))} />
                      </div>
                      {selectedAssessment.coffee_record?.coffee_type?.toLowerCase().includes('arabica') && (
                        <div>
                          <Label htmlFor="admin_robusta_in_arabica">Robusta in Arabica (%)</Label>
                          <Input id="admin_robusta_in_arabica" type="number" step="0.1" value={calculatorInputs.robustaInArabica} onChange={(e) => setCalculatorInputs((prev) => ({ ...prev, robustaInArabica: e.target.value }))} />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-1 text-xs text-muted-foreground">Calculated Final Price</div>
                        <div className="text-lg font-bold break-words">
                          {adminCalculation.finalPrice ? `${formatCurrency(Math.round(adminCalculation.finalPrice))}/kg` : 'No price'}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-1 text-xs text-muted-foreground">Outturn</div>
                        <div className="text-lg font-bold">{adminCalculation.outturn !== null ? `${adminCalculation.outturn.toFixed(1)}%` : '—'}</div>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-1 text-xs text-muted-foreground">FM / Note</div>
                        <div className="text-sm font-medium">FM {adminCalculation.fm.toFixed(1)}%</div>
                        <div className="mt-1 text-xs text-muted-foreground break-words">{adminCalculation.note}</div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        if (adminCalculation.finalPrice) {
                          setFinalPrice(Math.round(adminCalculation.finalPrice));
                        }
                      }}
                      disabled={!adminCalculation.finalPrice}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Apply Calculated Price
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="final_price">Final Price (UGX/kg) *</Label>
                    <Input
                      id="final_price"
                      type="number"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(Number(e.target.value))}
                      className="text-lg font-bold"
                    />
                    {selectedAssessment.coffee_record && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Total Value: <strong>{formatCurrency(finalPrice * selectedAssessment.coffee_record.kilograms)}</strong>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="admin_comments">Admin Comments</Label>
                    <Textarea
                      id="admin_comments"
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      placeholder="Optional comments or reason for rejection..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 gap-2 border-t px-4 py-4 sm:px-6">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!processingId}
            >
              {processingId === selectedAssessment?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={handleApproveWithPrice}
              disabled={!!processingId || !finalPrice}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingId === selectedAssessment?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve with Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GRNPrintModal
        open={showGRNModal}
        onClose={() => setShowGRNModal(false)}
        grnData={grnData}
      />
    </>
  );
};

export default AdminQualityPricingReview;
