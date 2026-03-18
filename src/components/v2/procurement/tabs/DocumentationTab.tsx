import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCheck, AlertTriangle } from "lucide-react";

const DocumentationTab = () => {
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['procurement-docs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('supplier_contracts').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: files } = useQuery({
    queryKey: ['procurement-contract-files'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contract_files').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const withFiles = new Set(files?.map(f => f.buyer_ref) || []);
  const missingDocs = contracts?.filter((c: any) => !withFiles.has(c.contract_ref)) || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileCheck className="h-5 w-5" />Documentation Completeness</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Contracts</p><p className="text-2xl font-bold">{contracts?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">With Documents</p><p className="text-2xl font-bold text-green-600">{(contracts?.length || 0) - missingDocs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Missing Docs</p><p className="text-2xl font-bold text-orange-600">{missingDocs.length}</p></CardContent></Card>
      </div>

      {missingDocs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Contracts Missing Documentation</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Contract Ref</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Doc Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {missingDocs.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.contract_ref}</TableCell>
                    <TableCell>{c.supplier_name}</TableCell>
                    <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell><Badge variant="destructive">Missing</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentationTab;
