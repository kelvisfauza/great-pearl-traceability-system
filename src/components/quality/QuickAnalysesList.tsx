import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Printer, Trash2, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import QuickAnalysisPrint from './QuickAnalysisPrint';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';

interface QuickAnalysis {
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

const QuickAnalysesList = () => {
  const { toast } = useToast();
  const { createVerification } = useDocumentVerification();
  const [analyses, setAnalyses] = useState<QuickAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<QuickAnalysis | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [viewAnalysis, setViewAnalysis] = useState<QuickAnalysis | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAnalyses(data || []);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      toast({
        title: 'Error',
        description: 'Failed to load quick analyses',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedAnalysis 
      ? `Analysis-${selectedAnalysis.supplier_name}-${format(new Date(selectedAnalysis.created_at), 'yyyyMMdd')}`
      : 'Quality-Analysis'
  });

  const handlePrintClick = async (analysis: QuickAnalysis) => {
    setSelectedAnalysis(analysis);
    
    // Generate verification code
    const code = await createVerification({
      type: 'assessment',
      subtype: 'Arabica Quality Analysis',
      issued_to_name: analysis.supplier_name,
      reference_no: analysis.id,
      meta: {
        coffeeType: analysis.coffee_type,
        finalPrice: analysis.final_price,
        outturn: analysis.outturn,
        isRejected: analysis.is_rejected
      }
    });
    setVerificationCode(code);
    
    // Use requestAnimationFrame to ensure DOM is updated before printing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handlePrint();
      });
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      const { error } = await supabase
        .from('quick_analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast({
        title: 'Deleted',
        description: 'Analysis deleted successfully'
      });
    } catch (err) {
      console.error('Error deleting analysis:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete analysis',
        variant: 'destructive'
      });
    }
  };

  const fmt = (n: number) => n?.toLocaleString('en-UG', { maximumFractionDigits: 0 }) || '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading analyses...</span>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quick Analyses</CardTitle>
              <CardDescription>Saved quick quality analyses from offer samples</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAnalyses}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No quick analyses saved yet.</p>
              <p className="text-sm mt-2">Use the Calculator tab to analyze and save offer samples.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Coffee Type</TableHead>
                  <TableHead>Ref Price</TableHead>
                  <TableHead>Final Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">
                        {format(new Date(analysis.created_at), 'dd MMM yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(analysis.created_at), 'HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{analysis.supplier_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {analysis.coffee_type}
                      </Badge>
                    </TableCell>
                    <TableCell>UGX {fmt(analysis.ref_price)}</TableCell>
                    <TableCell className={analysis.is_rejected ? 'text-destructive font-bold' : 'text-green-600 font-bold'}>
                      {analysis.is_rejected ? 'REJECT' : `UGX ${fmt(analysis.final_price)}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={analysis.is_rejected ? 'destructive' : 'default'}>
                        {analysis.is_rejected ? 'Rejected' : 'OK'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{analysis.created_by}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setViewAnalysis(analysis)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handlePrintClick(analysis)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(analysis.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Analysis Dialog */}
      <Dialog open={!!viewAnalysis} onOpenChange={() => setViewAnalysis(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analysis Details - {viewAnalysis?.supplier_name}</DialogTitle>
          </DialogHeader>
          {viewAnalysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(viewAnalysis.created_at), 'dd MMM yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coffee Type</p>
                  <Badge variant="outline" className="uppercase">{viewAnalysis.coffee_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reference Price</p>
                  <p className="font-medium">UGX {fmt(viewAnalysis.ref_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewAnalysis.is_rejected ? 'destructive' : 'default'}>
                    {viewAnalysis.is_rejected ? 'Rejected' : 'Accepted'}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Quality Parameters</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Moisture</p>
                    <p className="font-medium">{viewAnalysis.moisture}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">GP1</p>
                    <p className="font-medium">{viewAnalysis.gp1}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">GP2</p>
                    <p className="font-medium">{viewAnalysis.gp2}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Less 12</p>
                    <p className="font-medium">{viewAnalysis.less12}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Pods</p>
                    <p className="font-medium">{viewAnalysis.pods}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Husks</p>
                    <p className="font-medium">{viewAnalysis.husks}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Stones</p>
                    <p className="font-medium">{viewAnalysis.stones}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Discretion</p>
                    <p className="font-medium">{viewAnalysis.discretion}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">FM</p>
                    <p className="font-medium">{viewAnalysis.fm}%</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Calculated Results</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Actual OTT</p>
                    <p className="font-medium">{viewAnalysis.actual_ott}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Clean D14</p>
                    <p className="font-medium">{viewAnalysis.clean_d14}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Outturn</p>
                    <p className="font-medium">{viewAnalysis.outturn}%</p>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <p className="text-muted-foreground">Outturn Price</p>
                    <p className="font-medium">UGX {fmt(viewAnalysis.outturn_price)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Final Price</p>
                  <p className={`text-2xl font-bold ${viewAnalysis.is_rejected ? 'text-destructive' : 'text-primary'}`}>
                    {viewAnalysis.is_rejected ? 'REJECTED' : `UGX ${fmt(viewAnalysis.final_price)}`}
                  </p>
                </div>
              </div>

              {viewAnalysis.quality_note && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Quality Notes</p>
                  <p className="mt-1">{viewAnalysis.quality_note}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2">
                Analyzed by: {viewAnalysis.created_by}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden print component */}
      <div className="hidden">
        {selectedAnalysis && (
          <QuickAnalysisPrint ref={printRef} analysis={selectedAnalysis} verificationCode={verificationCode} />
        )}
      </div>
    </>
  );
};

export default QuickAnalysesList;
