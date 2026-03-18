import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lightbulb } from "lucide-react";

const AnalystRecommendationsTab = () => {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['analyst-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_recommendations').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Lightbulb className="h-5 w-5" />Procurement Recommendations</h3>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Supplier</TableHead><TableHead>Issue</TableHead><TableHead>Recommendation</TableHead><TableHead>Impact</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {recommendations?.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.supplier_name}</TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{r.issue_identified}</TableCell>
                <TableCell><Badge variant="outline">{r.recommendation_type}</Badge></TableCell>
                <TableCell className="text-sm max-w-[200px] truncate">{r.expected_impact}</TableCell>
                <TableCell><Badge variant={r.status === 'implemented' ? 'secondary' : 'outline'}>{r.status}</Badge></TableCell>
              </TableRow>
            ))}
            {(!recommendations || recommendations.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No recommendations yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default AnalystRecommendationsTab;
