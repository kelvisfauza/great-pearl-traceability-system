import { useState, useEffect, useCallback } from 'react';
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

const AdminQualityPricingReview = () => {
  const [assessments, setAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<PendingAssessment | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [adminComments, setAdminComments] = useState('');
  const [calculatorPrice, setCalculatorPrice] = useState<number | null>(null);
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
    setSelectedAssessment(assessment);
    setFinalPrice(assessment.suggested_price);
    setAdminComments('');
    setCalculatorPrice(null);
    setReviewModalOpen(true);
    if (assessment.coffee_record?.coffee_type) {
      fetchCalculatorPrice(assessment.coffee_record.coffee_type);
    }
  };

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
          stones: selectedAssessment.fm
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
    try {
      const { error: updateError } = await supabase
        .from('quality_assessments')
        .update({
          status: 'rejected',
          quality_note: adminComments,
          reject_final: true
        })
        .eq('id', selectedAssessment.id);
      if (updateError) throw updateError;

      if (selectedAssessment.store_record_id) {
        await supabase
          .from('coffee_records')
          .update({ status: 'QUALITY_REJECTED' })
          .eq('id', selectedAssessment.store_record_id);
      }

      toast({ title: "Assessment Rejected", description: `Lot ${selectedAssessment.batch_number} has been rejected` });
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Quality Assessment - {selectedAssessment?.batch_number}</DialogTitle>
          </DialogHeader>
          
          {selectedAssessment && (
            <div className="space-y-4">
              {/* Lot Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> <strong>{selectedAssessment.coffee_record?.supplier_name}</strong></div>
                <div><span className="text-muted-foreground">Coffee Type:</span> <strong>{selectedAssessment.coffee_record?.coffee_type}</strong></div>
                <div><span className="text-muted-foreground">Quantity:</span> <strong>{selectedAssessment.coffee_record?.kilograms?.toLocaleString()} kg</strong></div>
                <div><span className="text-muted-foreground">Bags:</span> <strong>{selectedAssessment.coffee_record?.bags}</strong></div>
                <div><span className="text-muted-foreground">Assessed By:</span> <strong>{selectedAssessment.assessed_by}</strong></div>
                <div><span className="text-muted-foreground">Date:</span> <strong>{selectedAssessment.date_assessed}</strong></div>
              </div>

              {/* Quality Parameters */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Quality Parameters</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Moisture</div>
                    <div className="font-bold">{selectedAssessment.moisture}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Outturn</div>
                    <div className="font-bold">{selectedAssessment.outturn ?? '-'}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Group 1</div>
                    <div className="font-bold">{selectedAssessment.group1_defects ?? 0}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Group 2</div>
                    <div className="font-bold">{selectedAssessment.group2_defects ?? 0}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Pods</div>
                    <div className="font-bold">{selectedAssessment.pods ?? 0}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Husks</div>
                    <div className="font-bold">{selectedAssessment.husks ?? 0}%</div>
                  </div>
                  <div className="p-2 border rounded text-center">
                    <div className="text-muted-foreground text-xs">Foreign Matter</div>
                    <div className="font-bold">{selectedAssessment.fm ?? 0}%</div>
                  </div>
                </div>
              </div>

              {selectedAssessment.comments && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">Quality Notes:</span> {selectedAssessment.comments}
                </div>
              )}

              {/* Pricing Section */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-sm">Pricing Decision</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <div className="text-xs text-muted-foreground mb-1">Suggested Price (Quality Team)</div>
                    <div className="text-lg font-bold">{formatCurrency(selectedAssessment.suggested_price)}/kg</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => setFinalPrice(selectedAssessment.suggested_price)}
                    >
                      Use Suggested Price
                    </Button>
                  </div>
                  
                  <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/30">
                    <div className="text-xs text-muted-foreground mb-1">Calculator Price (Market)</div>
                    <div className="text-lg font-bold">
                      {calculatorPrice ? `${formatCurrency(calculatorPrice)}/kg` : 'Loading...'}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => calculatorPrice && setFinalPrice(calculatorPrice)}
                      disabled={!calculatorPrice}
                    >
                      <Calculator className="h-3 w-3 mr-1" />
                      Use Calculator Price
                    </Button>
                  </div>
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
                    <p className="text-sm text-muted-foreground mt-1">
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
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!processingId}
            >
              {processingId === selectedAssessment?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApproveWithPrice}
              disabled={!!processingId || !finalPrice}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingId === selectedAssessment?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
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
