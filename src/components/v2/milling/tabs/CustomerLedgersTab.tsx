import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Smartphone } from "lucide-react";
import MillingMoMoBulkCollectModal from "@/components/milling/MillingMoMoBulkCollectModal";

const CustomerLedgersTab = () => {
  const [bulkOpen, setBulkOpen] = useState(false);
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['milling-customer-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('milling_customer_accounts').select('*').order('outstanding_balance', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalOutstanding = accounts?.reduce((s, a: any) => s + Number(a.outstanding_balance || 0), 0) || 0;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" />Customer Ledgers</h3>
        <Button onClick={() => setBulkOpen(true)} size="sm" className="w-full sm:w-auto">
          <Smartphone className="h-4 w-4 mr-2" />Bulk Collect Debts
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Customers</p><p className="text-2xl font-bold">{accounts?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Outstanding</p><p className="text-2xl font-bold text-orange-600">UGX {totalOutstanding.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead>Total Jobs</TableHead><TableHead>Total Kg</TableHead><TableHead>Total Charged</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {accounts?.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.customer_name}</TableCell>
                  <TableCell>{a.customer_phone || '—'}</TableCell>
                  <TableCell>{a.total_jobs}</TableCell>
                  <TableCell>{Number(a.total_milled_kg).toLocaleString()}</TableCell>
                  <TableCell>UGX {Number(a.total_charged).toLocaleString()}</TableCell>
                  <TableCell>UGX {Number(a.total_paid).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={Number(a.outstanding_balance) > 0 ? 'destructive' : 'secondary'}>
                      UGX {Number(a.outstanding_balance).toLocaleString()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!accounts || accounts.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No customer accounts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MillingMoMoBulkCollectModal open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </div>
  );
};

export default CustomerLedgersTab;
