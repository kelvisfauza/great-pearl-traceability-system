import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Warehouse } from "lucide-react";
import { format } from "date-fns";

const moldColor: Record<string, string> = { Low: 'bg-green-100 text-green-800', Medium: 'bg-yellow-100 text-yellow-800', High: 'bg-red-100 text-red-800' };

const WarehouseMonitoringTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ batch_number: '', current_moisture: '', mold_risk: 'Low', weight_loss_estimate: '0', temperature: '', humidity: '', remarks: '' });

  const { data: records, isLoading } = useQuery({
    queryKey: ['warehouse-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouse_quality_monitoring').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    }
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('warehouse_quality_monitoring').insert({
        batch_number: form.batch_number,
        current_moisture: parseFloat(form.current_moisture),
        mold_risk: form.mold_risk,
        weight_loss_estimate: parseFloat(form.weight_loss_estimate) || 0,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        humidity: form.humidity ? parseFloat(form.humidity) : null,
        remarks: form.remarks,
        monitored_by: employee?.email || ''
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Monitoring Record Saved" });
      queryClient.invalidateQueries({ queryKey: ['warehouse-monitoring'] });
      setShowForm(false);
      setForm({ batch_number: '', current_moisture: '', mold_risk: 'Low', weight_loss_estimate: '0', temperature: '', humidity: '', remarks: '' });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const highRisk = records?.filter((r: any) => r.mold_risk === 'High') || [];

  return (
    <div className="space-y-4 mt-4">
      {highRisk.length > 0 && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="p-4">
            <p className="font-semibold text-red-800">⚠️ {highRisk.length} batch(es) at HIGH mold risk!</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? 'Cancel' : 'Add Monitoring Record'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><Label>Batch Number</Label><Input value={form.batch_number} onChange={(e) => setForm(p => ({ ...p, batch_number: e.target.value }))} /></div>
              <div><Label>Current Moisture (%)</Label><Input type="number" step="0.1" value={form.current_moisture} onChange={(e) => setForm(p => ({ ...p, current_moisture: e.target.value }))} /></div>
              <div>
                <Label>Mold Risk</Label>
                <Select value={form.mold_risk} onValueChange={(v) => setForm(p => ({ ...p, mold_risk: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Weight Loss Est. (kg)</Label><Input type="number" step="0.1" value={form.weight_loss_estimate} onChange={(e) => setForm(p => ({ ...p, weight_loss_estimate: e.target.value }))} /></div>
              <div><Label>Temperature (°C)</Label><Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm(p => ({ ...p, temperature: e.target.value }))} /></div>
              <div><Label>Humidity (%)</Label><Input type="number" step="0.1" value={form.humidity} onChange={(e) => setForm(p => ({ ...p, humidity: e.target.value }))} /></div>
            </div>
            <div><Label>Remarks</Label><Textarea value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} /></div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || !form.batch_number || !form.current_moisture}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" />Warehouse Quality Records</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Moisture</TableHead>
                  <TableHead>Mold Risk</TableHead>
                  <TableHead>Weight Loss</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>Humidity</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{format(new Date(r.storage_date), 'PP')}</TableCell>
                    <TableCell className="font-mono">{r.batch_number}</TableCell>
                    <TableCell>{r.current_moisture}%</TableCell>
                    <TableCell><Badge className={moldColor[r.mold_risk] || ''}>{r.mold_risk}</Badge></TableCell>
                    <TableCell>{r.weight_loss_estimate} kg</TableCell>
                    <TableCell>{r.temperature ? `${r.temperature}°C` : '-'}</TableCell>
                    <TableCell>{r.humidity ? `${r.humidity}%` : '-'}</TableCell>
                    <TableCell className="text-sm">{r.monitored_by}</TableCell>
                  </TableRow>
                ))}
                {(!records || records.length === 0) && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No records yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseMonitoringTab;
