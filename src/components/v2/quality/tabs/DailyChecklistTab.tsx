import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckSquare, Plus } from "lucide-react";
import { format } from "date-fns";

const DailyChecklistTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: checklist, isLoading } = useQuery({
    queryKey: ['daily-checklist', today, employee?.email],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_daily_checklists')
        .select('*')
        .eq('employee_email', employee?.email || '')
        .eq('checklist_date', today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.email
  });

  const createChecklist = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('quality_daily_checklists').insert({
        employee_email: employee?.email || '',
        employee_name: employee?.full_name || '',
        checklist_date: today
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily-checklist'] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  const updateItem = useMutation({
    mutationFn: async (updates: any) => {
      if (!checklist) return;
      // Calculate completion percentage manually
      const merged = { ...checklist, ...updates };
      const completion = 
        (merged.calibration_done ? 20 : 0) +
        (Math.min(merged.batch_reviews_count || 0, 5) * 4) +
        (merged.daily_report_submitted ? 20 : 0) +
        (merged.supplier_analysis_updated ? 20 : 0) +
        (Math.min(merged.reevaluations_count || 0, 2) * 10);
      
      const { error } = await supabase.from('quality_daily_checklists')
        .update({ ...updates, completion_percentage: completion, updated_at: new Date().toISOString() })
        .eq('id', checklist.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daily-checklist'] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  // Recent checklists
  const { data: history } = useQuery({
    queryKey: ['checklist-history', employee?.email],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_daily_checklists')
        .select('*')
        .eq('employee_email', employee?.email || '')
        .order('checklist_date', { ascending: false })
        .limit(7);
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.email
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const completion = checklist?.completion_percentage || 0;

  const items = [
    { key: 'calibration_done', label: 'Equipment calibration completed', checked: checklist?.calibration_done, points: 20 },
    { key: 'batch_reviews', label: `Batch reviews (${checklist?.batch_reviews_count || 0}/5 minimum)`, checked: (checklist?.batch_reviews_count || 0) >= 5, points: 20 },
    { key: 'daily_report_submitted', label: 'Daily report submitted', checked: checklist?.daily_report_submitted, points: 20 },
    { key: 'supplier_analysis_updated', label: 'Supplier analysis updated', checked: checklist?.supplier_analysis_updated, points: 20 },
    { key: 'reevaluations', label: `Re-evaluations done (${checklist?.reevaluations_count || 0}/2 minimum)`, checked: (checklist?.reevaluations_count || 0) >= 2, points: 20 },
  ];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><CheckSquare className="h-5 w-5" />Daily Task Checklist</h3>
        <Badge variant="outline">{format(new Date(), 'PPP')}</Badge>
      </div>

      {!checklist ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Start your daily checklist to track progress</p>
            <Button onClick={() => createChecklist.mutate()} disabled={createChecklist.isPending}>
              {createChecklist.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-1 h-4 w-4" />Start Today's Checklist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Progress</CardTitle>
              <Badge className={completion >= 100 ? 'bg-green-100 text-green-800' : completion >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                {completion}%
              </Badge>
            </div>
            <Progress value={completion} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    if (item.key === 'calibration_done') updateItem.mutate({ calibration_done: checked });
                    else if (item.key === 'daily_report_submitted') updateItem.mutate({ daily_report_submitted: checked });
                    else if (item.key === 'supplier_analysis_updated') updateItem.mutate({ supplier_analysis_updated: checked });
                    else if (item.key === 'batch_reviews') updateItem.mutate({ batch_reviews_count: checked ? 5 : 0 });
                    else if (item.key === 'reevaluations') updateItem.mutate({ reevaluations_count: checked ? 2 : 0 });
                  }}
                />
                <div className="flex-1">
                  <p className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>{item.label}</p>
                </div>
                <Badge variant="outline" className="text-xs">{item.points} pts</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 1 && (
        <Card>
          <CardHeader><CardTitle>Recent Days</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.filter((h: any) => h.checklist_date !== today).map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">{format(new Date(h.checklist_date), 'PPP')}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={h.completion_percentage || 0} className="w-24 h-2" />
                    <Badge variant={h.completion_percentage >= 100 ? "secondary" : "outline"}>{h.completion_percentage || 0}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyChecklistTab;
