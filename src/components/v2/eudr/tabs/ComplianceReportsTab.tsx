import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Shield, CheckCircle } from "lucide-react";

const ComplianceReportsTab = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['eudr-compliance-report'],
    queryFn: async () => {
      const [docs, batches] = await Promise.all([
        supabase.from('eudr_documents').select('status'),
        supabase.from('eudr_batches').select('status'),
      ]);

      const totalDocs = docs.data?.length || 0;
      const activeDocs = docs.data?.filter(d => d.status === 'active').length || 0;
      const totalBatches = batches.data?.length || 0;
      const tracedBatches = batches.data?.filter(b => b.status === 'available').length || 0;

      return {
        totalDocs, activeDocs, totalBatches, tracedBatches,
        docComplianceRate: totalDocs > 0 ? ((activeDocs / totalDocs) * 100).toFixed(1) : '0',
        traceRate: totalBatches > 0 ? ((tracedBatches / totalBatches) * 100).toFixed(1) : '0',
      };
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Compliance & Risk Report</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><Shield className="h-6 w-6 mx-auto mb-2 text-blue-500" /><p className="text-sm text-muted-foreground">Doc Compliance</p><p className="text-2xl font-bold">{data?.docComplianceRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Active Docs</p><p className="text-2xl font-bold">{data?.activeDocs}/{data?.totalDocs}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Shield className="h-6 w-6 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground">Trace Rate</p><p className="text-2xl font-bold">{data?.traceRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" /><p className="text-sm text-muted-foreground">Traced Batches</p><p className="text-2xl font-bold">{data?.tracedBatches}/{data?.totalBatches}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Document compliance: <strong>{data?.docComplianceRate}%</strong> ({data?.activeDocs} of {data?.totalDocs} active)</p>
          <p>• Batch traceability: <strong>{data?.traceRate}%</strong> ({data?.tracedBatches} of {data?.totalBatches} traced)</p>
          {Number(data?.docComplianceRate) < 90 && <p className="text-destructive font-medium">⚠ Document compliance below 90% — action required</p>}
          {Number(data?.traceRate) < 95 && <p className="text-destructive font-medium">⚠ Batch traceability below 95% — risk of non-compliance</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceReportsTab;
