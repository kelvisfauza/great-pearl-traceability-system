import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import QuickAnalysisPrint from './QuickAnalysisPrint';

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
  const [analyses, setAnalyses] = useState<QuickAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<QuickAnalysis | null>(null);
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

  const handlePrintClick = (analysis: QuickAnalysis) => {
    setSelectedAnalysis(analysis);
    setTimeout(() => {
      handlePrint();
    }, 100);
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

      {/* Hidden print component */}
      <div className="hidden">
        {selectedAnalysis && (
          <QuickAnalysisPrint ref={printRef} analysis={selectedAnalysis} />
        )}
      </div>
    </>
  );
};

export default QuickAnalysesList;
