import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileWarning } from "lucide-react";

const MissingDocsTab = () => {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['eudr-missing-docs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('eudr_documents').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const expired = documents?.filter((d: any) => d.status === 'expired') || [];
  const missing = documents?.filter((d: any) => d.status === 'missing' || d.status === 'pending') || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileWarning className="h-5 w-5" />Missing & Expired Documents</h3>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Docs</p><p className="text-2xl font-bold">{documents?.length || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expired</p><p className="text-2xl font-bold text-destructive">{expired.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Missing/Pending</p><p className="text-2xl font-bold text-orange-600">{missing.length}</p></CardContent></Card>
      </div>

      {(expired.length > 0 || missing.length > 0) && (
        <Card>
          <CardHeader><CardTitle>Action Required</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Supplier</TableHead><TableHead>Issue</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...expired, ...missing].map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.document_type || d.doc_type || 'Document'}</TableCell>
                    <TableCell>{d.supplier_name || '—'}</TableCell>
                    <TableCell><Badge variant={d.status === 'expired' ? 'destructive' : 'outline'}>{d.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {expired.length === 0 && missing.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">All documents are up to date ✓</CardContent></Card>
      )}
    </div>
  );
};

export default MissingDocsTab;
