import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowDownUp } from "lucide-react";
import { format } from "date-fns";

const AdvancesRecoveriesTab = () => {
  const { data: advances, isLoading } = useQuery({
    queryKey: ['finance-advances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_advances').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const { data: recoveries } = useQuery({
    queryKey: ['finance-recoveries'],
    queryFn: async () => {
      const { data, error } = await supabase.from('advance_recoveries').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const totalAdvanced = advances?.reduce((s, a: any) => s + (a.amount_ugx || 0), 0) || 0;
  const totalRecovered = recoveries?.reduce((s, r: any) => s + (r.recovered_ugx || 0), 0) || 0;
  const outstanding = totalAdvanced - totalRecovered;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><ArrowDownUp className="h-5 w-5" />Advances & Recoveries</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Advanced</p><p className="text-2xl font-bold">UGX {totalAdvanced.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Recovered</p><p className="text-2xl font-bold text-green-600">UGX {totalRecovered.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-orange-600">UGX {outstanding.toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Advances</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Supplier</TableHead><TableHead>Amount</TableHead><TableHead>Recovered</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {advances?.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{format(new Date(a.created_at), 'PP')}</TableCell>
                  <TableCell>{a.supplier_name}</TableCell>
                  <TableCell>UGX {(a.amount_ugx || 0).toLocaleString()}</TableCell>
                  <TableCell>UGX {(a.recovered_ugx || 0).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">UGX {((a.amount_ugx || 0) - (a.recovered_ugx || 0)).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.status === 'fully_recovered' ? 'secondary' : 'outline'}>{a.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(!advances || advances.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No advances</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancesRecoveriesTab;
