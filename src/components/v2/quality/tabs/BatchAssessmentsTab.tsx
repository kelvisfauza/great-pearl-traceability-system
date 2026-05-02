import { useState } from "react";
import { openBulkGRNPrintWindow, GRNData } from "@/utils/bulkGRNPrint";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, FlaskConical, CheckCircle, XCircle, Clock, Printer } from "lucide-react";
import { Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GRNPrintModal from "@/components/quality/GRNPrintModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const BatchAssessmentsTab = () => {
  const navigate = useNavigate();
  const { employee, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [grnModal, setGrnModal] = useState<{ open: boolean; grnData: any; assessmentId: string | null; coffeeRecordId: string | null }>({ open: false, grnData: null, assessmentId: null, coffeeRecordId: null });
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const [permRejectModal, setPermRejectModal] = useState<{ open: boolean; lot: any | null; assessment: any | null }>({ open: false, lot: null, assessment: null });
  const [permRejectNotes, setPermRejectNotes] = useState('');
  const [permRejectSubmitting, setPermRejectSubmitting] = useState(false);

  const { data: lots, isLoading } = useQuery({
    queryKey: ['quality-all-lots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: assessments } = useQuery({
    queryKey: ['quality-all-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const pendingCount = lots?.filter(l => l.status === 'pending').length || 0;
  const assessedCount = assessments?.length || 0;
  const rejectedCount = lots?.filter(l => l.status === 'QUALITY_REJECTED').length || 0;

  const getAssessmentForLot = (batchNumber: string) => {
    return assessments?.find(a => a.batch_number === batchNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'AWAITING_PRICING': return <Badge className="bg-blue-100 text-blue-800">Awaiting Pricing</Badge>;
      case 'QUALITY_REJECTED': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default: return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />{status}</Badge>;
    }
  };

  const currentUserName = employee?.name || employee?.email || 'Unknown';
  const isAdmin = isSuperAdmin();

  // Helper: a GRN is printable only when there is a real price
  const hasPrintablePrice = (assessment: any) => {
    if (!assessment) return false;
    if (assessment.permanently_rejected) return false;
    const finalPrice = Number(assessment.final_price || 0);
    const suggested = Number(assessment.suggested_price || 0);
    const discretionPrice = Number(assessment.admin_discretion_price || 0);
    if (assessment.reject_final && !assessment.admin_discretion_buy) return false;
    return finalPrice > 0 || suggested > 0 || discretionPrice > 0;
  };

  const submitPermanentReject = async () => {
    if (!permRejectModal.lot) return;
    if (!permRejectNotes.trim()) {
      toast({ title: 'Reason required', description: 'Enter why this lot is being returned to the supplier.', variant: 'destructive' });
      return;
    }
    setPermRejectSubmitting(true);
    try {
      const lot = permRejectModal.lot;
      const assessment = permRejectModal.assessment;
      const payload: any = {
        permanently_rejected: true,
        permanently_rejected_by: currentUserName,
        permanently_rejected_at: new Date().toISOString(),
        permanently_rejected_notes: permRejectNotes.trim(),
        reject_final: true,
        admin_discretion_buy: false,
        status: 'PERMANENTLY_REJECTED',
      };

      if (assessment?.id) {
        const { error } = await supabase
          .from('quality_assessments')
          .update(payload)
          .eq('id', assessment.id);
        if (error) throw error;
      } else {
        // Create a minimal assessment record to capture the rejection
        const { error } = await supabase
          .from('quality_assessments')
          .insert({
            store_record_id: lot.id,
            batch_number: lot.batch_number,
            assessed_by: currentUserName,
            date_assessed: new Date().toISOString().slice(0, 10),
            moisture: 0,
            suggested_price: 0,
            ...payload,
          } as any);
        if (error) throw error;
      }

      // Mark coffee_record so it stays out of inventory
      await (supabase.from('coffee_records') as any)
        .update({ status: 'PERMANENTLY_REJECTED' })
        .eq('id', lot.id);

      toast({ title: 'Lot permanently rejected', description: `${lot.batch_number} marked as returned to supplier.` });
      setPermRejectModal({ open: false, lot: null, assessment: null });
      setPermRejectNotes('');
      queryClient.invalidateQueries({ queryKey: ['quality-all-lots'] });
      queryClient.invalidateQueries({ queryKey: ['quality-all-assessments'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPermRejectSubmitting(false);
    }
  };

  const markGRNPrinted = async (assessmentId: string, coffeeRecordId?: string) => {
    await supabase
      .from('quality_assessments')
      .update({
        grn_printed: true,
        grn_printed_by: currentUserName,
        grn_printed_at: new Date().toISOString()
      })
      .eq('id', assessmentId);
    if (coffeeRecordId) {
      await (supabase.from('coffee_records') as any).update({
        grn_printed_at: new Date().toISOString(),
        grn_printed_by: currentUserName,
      }).eq('id', coffeeRecordId);
    }
    queryClient.invalidateQueries({ queryKey: ['quality-all-assessments'] });
  };

  const openGRNForLot = (lot: any, assessment: any) => {
    const grnData = {
      grnNumber: `GRN-${lot.batch_number}`,
      supplierName: lot.supplier_name,
      coffeeType: lot.coffee_type,
      qualityAssessment: `Moisture: ${assessment.moisture}%`,
      numberOfBags: lot.bags,
      totalKgs: lot.kilograms,
      unitPrice: assessment.final_price || assessment.suggested_price || 0,
      assessedBy: assessment.assessed_by || '',
      createdAt: assessment.created_at,
      moisture: assessment.moisture,
      group1_defects: assessment.group1_defects,
      group2_defects: assessment.group2_defects,
      below12: assessment.below12,
      pods: assessment.pods,
      husks: assessment.husks,
      stones: assessment.stones,
      outturn: assessment.outturn,
      calculatorComments: assessment.quality_note,
      isDiscretionBuy: assessment.admin_discretion_buy,
      printedBy: currentUserName,
    };
    setGrnModal({ open: true, grnData, assessmentId: assessment.id, coffeeRecordId: lot.id });
  };

  const handlePrinted = async () => {
    if (grnModal.assessmentId) {
      await markGRNPrinted(grnModal.assessmentId, grnModal.coffeeRecordId || undefined);
    }
    setGrnModal({ open: false, grnData: null, assessmentId: null, coffeeRecordId: null });
    toast({ title: "GRN Printed", description: "GRN print status has been recorded." });
  };

  const handleBulkPrint = async () => {
    const printableLots = lots?.filter(l => {
      const assessment = getAssessmentForLot(l.batch_number);
      if (!assessment) return false;
      if (!hasPrintablePrice(assessment)) return false;
      const isPrinted = assessment.grn_printed;
      if (isPrinted && !isAdmin) return false;
      return selectedIds.includes(l.id);
    }) || [];

    if (printableLots.length === 0) {
      toast({ title: "No lots to print", description: "Select assessed lots that haven't been printed yet.", variant: "destructive" });
      return;
    }

    setBulkPrinting(true);

    // Build all GRN data and open a single print window
    const grnDataList: GRNData[] = printableLots.map(lot => {
      const assessment = getAssessmentForLot(lot.batch_number)!;
      return {
        grnNumber: `GRN-${lot.batch_number}`,
        supplierName: lot.supplier_name,
        coffeeType: lot.coffee_type,
        numberOfBags: lot.bags,
        totalKgs: lot.kilograms,
        unitPrice: assessment.final_price || assessment.suggested_price || 0,
        assessedBy: assessment.assessed_by || '',
        createdAt: assessment.created_at,
        moisture: assessment.moisture,
        group1_defects: assessment.group1_defects,
        group2_defects: assessment.group2_defects,
        below12: assessment.below12,
        pods: assessment.pods,
        husks: assessment.husks,
        stones: assessment.stones,
        outturn: assessment.outturn,
        calculatorComments: assessment.quality_note,
        isDiscretionBuy: assessment.admin_discretion_buy,
        printedBy: currentUserName,
      };
    });

    openBulkGRNPrintWindow(grnDataList);

    // Mark all as printed
    for (const lot of printableLots) {
      const assessment = getAssessmentForLot(lot.batch_number)!;
      await markGRNPrinted(assessment.id, lot.id);
    }

    setBulkPrinting(false);
    setSelectedIds([]);
    toast({ title: "Bulk GRN Printed", description: `${grnDataList.length} GRN documents sent to printer.` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const assessedLotIds = lots?.filter(l => getAssessmentForLot(l.batch_number)).map(l => l.id) || [];
    if (selectedIds.length === assessedLotIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assessedLotIds);
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const assessedLotIds = lots?.filter(l => getAssessmentForLot(l.batch_number)).map(l => l.id) || [];

  return (
    <div className="space-y-4 mt-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Assessed</p>
              <p className="text-2xl font-bold">{assessedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100"><XCircle className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold">{rejectedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button size="sm" onClick={handleBulkPrint} disabled={bulkPrinting}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            {bulkPrinting ? 'Printing...' : 'Bulk Print GRN'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      )}

      {/* Batch Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            All Coffee Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={assessedLotIds.length > 0 && selectedIds.length === assessedLotIds.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots?.map((lot) => {
                  const assessment = getAssessmentForLot(lot.batch_number);
                  const grnPrinted = assessment?.grn_printed;
                  const grnPrintedBy = assessment?.grn_printed_by;
                  const hasAssessment = !!assessment;
                  const printable = hasPrintablePrice(assessment);
                  const isPermRejected = assessment?.permanently_rejected || lot.status === 'PERMANENTLY_REJECTED';

                  return (
                    <TableRow key={lot.id}>
                      <TableCell>
                        {hasAssessment && printable && (
                          <Checkbox
                            checked={selectedIds.includes(lot.id)}
                            onCheckedChange={() => toggleSelect(lot.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(lot.date), 'PP')}</TableCell>
                      <TableCell className="font-mono text-sm">{lot.batch_number}</TableCell>
                      <TableCell>{lot.supplier_name}</TableCell>
                      <TableCell>{lot.coffee_type}</TableCell>
                      <TableCell className="text-right">{lot.kilograms?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{lot.bags}</TableCell>
                      <TableCell>
                        {isPermRejected
                          ? <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />Returned to Supplier</Badge>
                          : getStatusBadge(lot.status)}
                      </TableCell>
                      <TableCell>
                        {isPermRejected ? (
                          <span className="text-xs text-muted-foreground">No GRN</span>
                        ) : hasAssessment ? (
                          grnPrinted ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <Printer className="mr-1 h-3 w-3" />Printed
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">by {grnPrintedBy}</span>
                            </div>
                          ) : !printable ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                              Awaiting Admin Pricing
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                              Not Printed
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {lot.status === 'pending' && !isPermRejected && (
                            <Button size="sm" onClick={() => navigate(`/v2/quality/assess/${lot.id}`)}>
                              <FlaskConical className="mr-1 h-3.5 w-3.5" />
                              Assess
                            </Button>
                          )}
                          {hasAssessment && !grnPrinted && printable && !isPermRejected && (
                            <Button size="sm" variant="outline" onClick={() => openGRNForLot(lot, assessment)}>
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Print GRN
                            </Button>
                          )}
                          {hasAssessment && grnPrinted && isAdmin && !isPermRejected && (
                            <Button size="sm" variant="ghost" onClick={() => openGRNForLot(lot, assessment)}>
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Reprint
                            </Button>
                          )}
                          {!isPermRejected && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setPermRejectModal({ open: true, lot, assessment });
                                setPermRejectNotes('');
                              }}
                              title="Mark as permanently rejected (returned to supplier, no inventory)"
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GRNPrintModal
        open={grnModal.open}
        onClose={() => setGrnModal({ open: false, grnData: null, assessmentId: null, coffeeRecordId: null })}
        grnData={grnModal.grnData}
        onPrinted={handlePrinted}
      />

      <Dialog open={permRejectModal.open} onOpenChange={(o) => !o && setPermRejectModal({ open: false, lot: null, assessment: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Mark as Permanently Rejected
            </DialogTitle>
            <DialogDescription>
              This lot will be marked as returned to the supplier. It will NOT be added to inventory and no GRN can be printed for it.
            </DialogDescription>
          </DialogHeader>
          {permRejectModal.lot && (
            <div className="space-y-3">
              <div className="text-sm bg-muted p-3 rounded-lg">
                <p><strong>Batch:</strong> {permRejectModal.lot.batch_number}</p>
                <p><strong>Supplier:</strong> {permRejectModal.lot.supplier_name}</p>
                <p><strong>Quantity:</strong> {permRejectModal.lot.kilograms} kg ({permRejectModal.lot.bags} bags)</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason / Notes *</label>
                <Textarea
                  rows={3}
                  placeholder="Why is this coffee being returned to the supplier?"
                  value={permRejectNotes}
                  onChange={(e) => setPermRejectNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermRejectModal({ open: false, lot: null, assessment: null })}>Cancel</Button>
            <Button variant="destructive" onClick={submitPermanentReject} disabled={permRejectSubmitting}>
              {permRejectSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Ban className="h-4 w-4 mr-1" />
              Confirm Permanent Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchAssessmentsTab;
