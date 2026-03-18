import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, FlaskConical, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BatchAssessmentsTab = () => {
  const navigate = useNavigate();

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'AWAITING_PRICING': return <Badge className="bg-blue-100 text-blue-800">Awaiting Pricing</Badge>;
      case 'QUALITY_REJECTED': return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default: return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />{status}</Badge>;
    }
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

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
                  <TableHead>Date</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lots?.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="text-sm">{format(new Date(lot.date), 'PP')}</TableCell>
                    <TableCell className="font-mono text-sm">{lot.batch_number}</TableCell>
                    <TableCell>{lot.supplier_name}</TableCell>
                    <TableCell>{lot.coffee_type}</TableCell>
                    <TableCell className="text-right">{lot.kilograms?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{lot.bags}</TableCell>
                    <TableCell>{getStatusBadge(lot.status)}</TableCell>
                    <TableCell className="text-right">
                      {lot.status === 'pending' && (
                        <Button size="sm" onClick={() => navigate(`/v2/quality/assess/${lot.id}`)}>
                          <FlaskConical className="mr-1 h-3.5 w-3.5" />
                          Assess
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchAssessmentsTab;
