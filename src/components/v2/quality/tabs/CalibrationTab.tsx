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
import { Loader2, Settings2, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const DEVICES = ["Moisture Meter", "Weighing Scale (Small)", "Weighing Scale (Large)", "Thermometer", "Hygrometer"];

const CalibrationTab = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ device_name: '', expected_value: '', actual_value: '', notes: '' });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['calibration-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('calibration_logs')
        .select('*')
        .order('calibration_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const todayLogs = logs?.filter((l: any) => l.calibration_date === new Date().toISOString().split('T')[0]) || [];
  const needsCalibration = DEVICES.filter(d => !todayLogs.some((l: any) => l.device_name === d));

  const submit = useMutation({
    mutationFn: async () => {
      const expected = parseFloat(form.expected_value);
      const actual = parseFloat(form.actual_value);
      const variance = actual - expected;
      const { error } = await (supabase as any).from('calibration_logs').insert({
        device_name: form.device_name,
        expected_value: expected,
        actual_value: actual,
        status: Math.abs(variance) > 0.5 ? 'Needs Adjustment' : 'OK',
        done_by: employee?.email || '',
        notes: form.notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Calibration Logged" });
      queryClient.invalidateQueries({ queryKey: ['calibration-logs'] });
      setShowForm(false);
      setForm({ device_name: '', expected_value: '', actual_value: '', notes: '' });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 mt-4">
      {/* Today's Status */}
      <Card className={needsCalibration.length > 0 ? "border-yellow-300 bg-yellow-50/50" : "border-green-300 bg-green-50/50"}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {needsCalibration.length > 0 ? (
              <><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="font-semibold text-yellow-800">{needsCalibration.length} device(s) not calibrated today</span></>
            ) : (
              <><CheckCircle className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-800">All devices calibrated today ✓</span></>
            )}
          </div>
          {needsCalibration.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {needsCalibration.map(d => <Badge key={d} variant="outline" className="text-yellow-700">{d}</Badge>)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Calibration */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" />{showForm ? 'Cancel' : 'Log Calibration'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Device</Label>
                <Select value={form.device_name} onValueChange={(v) => setForm(p => ({ ...p, device_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                  <SelectContent>
                    {DEVICES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Value</Label>
                <Input type="number" step="0.01" value={form.expected_value} onChange={(e) => setForm(p => ({ ...p, expected_value: e.target.value }))} />
              </div>
              <div>
                <Label>Actual Value</Label>
                <Input type="number" step="0.01" value={form.actual_value} onChange={(e) => setForm(p => ({ ...p, actual_value: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || !form.device_name}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calibration History */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Calibration History</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Done By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{format(new Date(l.calibration_date), 'PP')}</TableCell>
                    <TableCell>{l.device_name}</TableCell>
                    <TableCell>{l.expected_value}</TableCell>
                    <TableCell>{l.actual_value}</TableCell>
                    <TableCell>
                      <Badge variant={Math.abs(l.variance) > 0.5 ? "destructive" : "secondary"}>
                        {l.variance > 0 ? '+' : ''}{Number(l.variance).toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'OK' ? "secondary" : "destructive"}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{l.done_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalibrationTab;
