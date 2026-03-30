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
import { AlertTriangle, DollarSign, Loader2, Coffee, Package, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import GRNPrintModal from '@/components/quality/GRNPrintModal';

interface RejectedLot {
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
  quality_note: string | null;
  store_record_id: string | null;
  admin_discretion_buy: boolean | null;
  admin_discretion_price: number | null;
  coffee_record?: {
    id: string;
    supplier_name: string;
    coffee_type: string;
    kilograms: number;
    bags: number;
  };
}

const AdminRejectedLotsReview = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [rejectedLots, setRejectedLots] = useState<RejectedLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState<RejectedLot | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [discretionPrice, setDiscretionPrice] = useState('');
  const [discretionNotes, setDiscretionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnData, setGrnData] = useState<any>(null);

  const fetchRejectedLots = useCallback(async () => {
    setLoading(true);
    try {
      // Get rejected assessments that haven't been bought yet
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .eq('reject_final', true)
        .eq('admin_discretion_buy', false)
        .order('date_assessed', { ascending: false });

      if (error) throw error;

      // Fetch associated coffee records
      const enriched = await Promise.all((data || []).map(async (assessment) => {
        if (assessment.store_record_id) {
          const { data: record } = await supabase
            .from('coffee_records')
            .select('id, supplier_name, coffee_type, kilograms, bags')
            .eq('id', assessment.store_record_id)
            .single();
          return { ...assessment, coffee_record: record || undefined };
        }
        return assessment;
      }));

      setRejectedLots(enriched);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchRejectedLots(); }, [fetchRejectedLots]);

  const handleBuyAtDiscretion = async () => {
    if (!selectedLot || !discretionPrice) {
      toast({ title: 'Price Required', description: 'Enter a discretion price per kg', variant: 'destructive' });
      return;
    }

    const price = parseFloat(discretionPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Invalid Price', description: 'Enter a valid price', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // 1. Update quality_assessments with discretion buy info
      const { error: assessError } = await supabase
        .from('quality_assessments')
        .update({
          admin_discretion_buy: true,
          admin_discretion_price: price,
          admin_discretion_by: employee?.email || '',
          admin_discretion_at: new Date().toISOString(),
          admin_discretion_notes: discretionNotes || `Admin discretion buy at UGX ${price.toLocaleString()}/kg`,
          final_price: price,
        })
        .eq('id', selectedLot.id);

      if (assessError) throw assessError;

      // 2. Mark coffee_record as discretion_bought (status stays QUALITY_REJECTED)
      if (selectedLot.store_record_id) {
        const { error: recordError } = await supabase
          .from('coffee_records')
          .update({ discretion_bought: true })
          .eq('id', selectedLot.store_record_id);

        if (recordError) throw recordError;
      }

      // 3. Prepare GRN data
      if (selectedLot.coffee_record) {
        const cr = selectedLot.coffee_record;
        setGrnData({
          grnNumber: `GRN-DISC-${selectedLot.batch_number}`,
          supplierName: cr.supplier_name,
          coffeeType: cr.coffee_type,
          qualityAssessment: 'REJECTED - Admin Discretion Buy',
          numberOfBags: cr.bags,
          totalKgs: cr.kilograms,
          unitPrice: price,
          assessedBy: selectedLot.assessed_by,
          createdAt: new Date().toISOString(),
          moisture: selectedLot.moisture,
          group1_defects: selectedLot.group1_defects,
          group2_defects: selectedLot.group2_defects,
          pods: selectedLot.pods,
          husks: selectedLot.husks,
          outturn: selectedLot.outturn,
          calculatorComments: `⚠️ REJECTED LOT - BOUGHT AT ADMIN DISCRETION\nRejection Reason: ${selectedLot.quality_note || selectedLot.comments || 'Quality thresholds exceeded'}\nDiscretion Price: UGX ${price.toLocaleString()}/kg\nApproved By: ${employee?.name || employee?.email}\nNotes: ${discretionNotes || 'N/A'}`,
          isDiscretionBuy: true,
          rejectionReason: selectedLot.quality_note || selectedLot.comments || 'Quality thresholds exceeded',
        });
        setShowGRNModal(true);
      }

      toast({
        title: 'Discretion Buy Approved',
        description: `Rejected lot ${selectedLot.batch_number} bought at UGX ${price.toLocaleString()}/kg`,
      });

      setBuyModalOpen(false);
      setDiscretionPrice('');
      setDiscretionNotes('');
      setSelectedLot(null);
      fetchRejectedLots();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading rejected lots...
        </CardContent>
      </Card>
    );
  }

  if (rejectedLots.length === 0) return null;

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg">Rejected Lots — Admin Discretion</CardTitle>
              <CardDescription>
                {rejectedLots.length} rejected lot{rejectedLots.length !== 1 ? 's' : ''} available for discretionary purchase
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rejectedLots.map((lot) => (
              <div
                key={lot.id}
                className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Coffee className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm">{lot.batch_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {lot.coffee_record?.supplier_name || 'Unknown'} • {lot.coffee_record?.coffee_type || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{lot.coffee_record?.kilograms?.toLocaleString() || 0} kg</p>
                    <p className="text-xs text-muted-foreground">{lot.coffee_record?.bags || 0} bags</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Moisture: {lot.moisture}%</p>
                    <p className="text-xs text-muted-foreground">Outturn: {lot.outturn || 'N/A'}%</p>
                  </div>
                  <Badge variant="destructive" className="text-xs">Rejected</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => {
                      setSelectedLot(lot);
                      setBuyModalOpen(true);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Buy at Discretion
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buy at Discretion Modal */}
      <Dialog open={buyModalOpen} onOpenChange={setBuyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Discretionary Purchase — Rejected Lot
            </DialogTitle>
          </DialogHeader>

          {selectedLot && (
            <div className="space-y-4">
              {/* Lot Info */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-destructive mb-1">⚠️ This lot was REJECTED by Quality</p>
                <p className="text-xs text-muted-foreground">
                  Reason: {selectedLot.quality_note || selectedLot.comments || 'Quality thresholds exceeded'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Batch</p>
                  <p className="font-medium">{selectedLot.batch_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedLot.coffee_record?.supplier_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coffee Type</p>
                  <p className="font-medium">{selectedLot.coffee_record?.coffee_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Weight</p>
                  <p className="font-medium">{selectedLot.coffee_record?.kilograms?.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Moisture</p>
                  <p className="font-medium">{selectedLot.moisture}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outturn</p>
                  <p className="font-medium">{selectedLot.outturn || 'N/A'}%</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <Label htmlFor="discretion_price" className="text-sm font-semibold">
                    Discretion Price (UGX/kg) *
                  </Label>
                  <Input
                    id="discretion_price"
                    type="number"
                    placeholder="Enter price per kg..."
                    value={discretionPrice}
                    onChange={(e) => setDiscretionPrice(e.target.value)}
                  />
                  {discretionPrice && selectedLot.coffee_record && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: UGX {(parseFloat(discretionPrice) * selectedLot.coffee_record.kilograms).toLocaleString()}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="discretion_notes" className="text-sm">Notes / Justification</Label>
                  <Textarea
                    id="discretion_notes"
                    placeholder="Why are you buying this rejected lot?"
                    value={discretionNotes}
                    onChange={(e) => setDiscretionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBuyAtDiscretion} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <DollarSign className="h-4 w-4 mr-1" />
              Confirm Discretion Buy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN Print Modal */}
      <GRNPrintModal
        open={showGRNModal}
        onClose={() => { setShowGRNModal(false); setGrnData(null); }}
        grnData={grnData}
      />
    </>
  );
};

export default AdminRejectedLotsReview;
