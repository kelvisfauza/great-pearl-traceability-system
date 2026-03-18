import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, BookOpen } from "lucide-react";

const CATEGORIES = ['Black Beans', 'Broken', 'Husk', 'Stones', 'Foreign Matter', 'Mold', 'Insect Damage', 'Other'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

const severityColor: Record<string, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};

const DefectLibraryTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ defect_name: '', category: '', description: '', severity: 'Medium', image_url: '' });

  const { data: defects, isLoading } = useQuery({
    queryKey: ['defect-library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('defect_library').select('*').order('category');
      if (error) throw error;
      return data;
    }
  });

  const addDefect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('defect_library').insert({ ...form, added_by: employee?.email || '' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Defect Added" });
      queryClient.invalidateQueries({ queryKey: ['defect-library'] });
      setShowForm(false);
      setForm({ defect_name: '', category: '', description: '', severity: 'Medium', image_url: '' });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const grouped = (defects || []).reduce((acc: any, d: any) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" />Defect Knowledge Base</h3>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? 'Cancel' : 'Add Defect'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Defect Name</Label>
                <Input value={form.defect_name} onChange={(e) => setForm(p => ({ ...p, defect_name: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input value={form.image_url} onChange={(e) => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <Button onClick={() => addDefect.mutate()} disabled={addDefect.isPending || !form.defect_name || !form.category}>
              {addDefect.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Defect
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grouped Defects */}
      {Object.entries(grouped).map(([category, items]: [string, any]) => (
        <Card key={category}>
          <CardHeader className="pb-3"><CardTitle className="text-base">{category} ({items.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((d: any) => (
                <div key={d.id} className="p-3 rounded-lg border bg-card">
                  {d.image_url && <img src={d.image_url} alt={d.defect_name} className="w-full h-24 object-cover rounded mb-2" />}
                  <h4 className="font-medium">{d.defect_name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{d.description || 'No description'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={severityColor[d.severity] || ''}>{d.severity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(grouped).length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No defects in library yet. Add your first defect to build the knowledge base.</CardContent></Card>
      )}
    </div>
  );
};

export default DefectLibraryTab;
