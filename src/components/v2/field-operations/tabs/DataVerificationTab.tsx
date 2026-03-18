import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";

const DataVerificationTab = () => {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ['field-data-verify'],
    queryFn: async () => {
      const { data, error } = await supabase.from('field_purchases').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Flag suspicious entries: zero kg, negative values, unreasonably high kg
  const flagged = purchases?.filter((p: any) => 
    !p.kgs_purchased || p.kgs_purchased <= 0 || p.kgs_purchased > 10000 || !p.farmer_name
  ) || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Data Accuracy Verification</h3>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Checked</p><p className="text-2xl font-bold">{purchases?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Flagged Issues</p><p className="text-2xl font-bold text-destructive">{flagged.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Flagged Records (Missing data, zero kg, or outliers)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Farmer</TableHead><TableHead>District</TableHead><TableHead>Kg</TableHead><TableHead>Issue</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {flagged.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.farmer_name || '—'}</TableCell>
                  <TableCell>{p.district || '—'}</TableCell>
                  <TableCell>{p.kgs_purchased}</TableCell>
                  <TableCell>
                    {!p.farmer_name && <Badge variant="destructive" className="mr-1">No farmer</Badge>}
                    {(!p.kgs_purchased || p.kgs_purchased <= 0) && <Badge variant="destructive" className="mr-1">Zero/negative kg</Badge>}
                    {p.kgs_purchased > 10000 && <Badge variant="destructive">Outlier ({p.kgs_purchased} kg)</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {flagged.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">All records look clean ✓</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVerificationTab;
