import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

interface Batch {
  id: string;
  file_name: string;
  period_start: string | null;
  period_end: string | null;
  uploaded_by: string;
  total_rows: number;
  status: string;
  created_at: string;
}

interface Row {
  id: string;
  batch_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string | null;
  record_date: string;
  punches: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  attendance_status: string;
  assumed_arrival: boolean;
  assumed_departure: boolean;
  existing_arrival: string | null;
  existing_departure: string | null;
  existing_status: string | null;
  has_existing: boolean;
  edited: boolean;
  row_status: string;
  notes: string | null;
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');

interface Props { onApplied?: () => void }

const AttendanceImportApprovals = ({ onApplied }: Props) => {
  const { employee } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState<string>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState('');
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  const fetchBatches = useCallback(async () => {
    const { data } = await supabase
      .from('attendance_import_batches' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data || []) as unknown as Batch[];
    setBatches(list);
    setActiveBatch((prev) => prev || list.find((b) => b.status === 'pending')?.id || list[0]?.id || '');
  }, []);

  const fetchRows = useCallback(async (batchId: string) => {
    if (!batchId) { setRows([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance_import_rows' as any)
      .select('*')
      .eq('batch_id', batchId)
      .order('employee_name')
      .order('record_date');
    if (error) toast.error(error.message);
    setRows(((data || []) as unknown as Row[]));
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);
  useEffect(() => { fetchRows(activeBatch); }, [activeBatch, fetchRows]);

  const patchRow = async (row: Row, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch, edited: true } as Row : r)));
    const { error } = await supabase
      .from('attendance_import_rows' as any)
      .update({ ...patch, edited: true } as any)
      .eq('id', row.id);
    if (error) toast.error(error.message);
  };

  const setRowStatus = async (row: Row, row_status: string) => {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, row_status } as Row : r)));
    await supabase
      .from('attendance_import_rows' as any)
      .update({ row_status, approved_by: employee?.email || 'IT', approved_at: new Date().toISOString() } as any)
      .eq('id', row.id);
  };

  const bulkStatus = async (row_status: string) => {
    if (!activeBatch) return;
    setWorking(true);
    const { error } = await supabase
      .from('attendance_import_rows' as any)
      .update({ row_status, approved_by: employee?.email || 'IT', approved_at: new Date().toISOString() } as any)
      .eq('batch_id', activeBatch)
      .neq('row_status', 'applied');
    if (error) toast.error(error.message);
    else toast.success(`All rows marked ${row_status}`);
    await fetchRows(activeBatch);
    setWorking(false);
  };

  /** Applies approved rows into attendance_time_records using the standard rules. */
  const applyApproved = async () => {
    const approved = rows.filter((r) => r.row_status === 'approved');
    if (!approved.length) {
      toast.error('No approved rows to save. Approve rows first.');
      return;
    }
    setWorking(true);
    try {
      const payload = approved.map((r) => ({
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        employee_email: r.employee_email,
        record_date: r.record_date,
        arrival_time: r.attendance_status === 'absent' ? null : hhmm(r.arrival_time),
        departure_time: r.attendance_status === 'absent' ? null : hhmm(r.departure_time),
        standard_start: '08:00',
        standard_end: '17:30',
        status: r.attendance_status,
        notes: [r.notes, r.punches ? `taps: ${r.punches}` : 'no taps', r.edited ? 'edited at approval' : '']
          .filter(Boolean)
          .join(' | '),
        recorded_by: employee?.email || 'IT-BIOMETRIC',
      }));

      const chunk = 200;
      let saved = 0;
      for (let i = 0; i < payload.length; i += chunk) {
        const { error } = await supabase
          .from('attendance_time_records')
          .upsert(payload.slice(i, i + chunk) as any, { onConflict: 'employee_id,record_date' });
        if (error) throw error;
        saved += Math.min(chunk, payload.length - i);
      }

      await supabase
        .from('attendance_import_rows' as any)
        .update({ row_status: 'applied' } as any)
        .eq('batch_id', activeBatch)
        .eq('row_status', 'approved');

      const remaining = rows.filter((r) => r.row_status === 'pending').length;
      await supabase
        .from('attendance_import_batches' as any)
        .update({ status: remaining ? 'pending' : 'approved' } as any)
        .eq('id', activeBatch);

      toast.success(`${saved} attendance records saved to the system`);
      await Promise.all([fetchRows(activeBatch), fetchBatches()]);
      onApplied?.();
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  const deleteBatch = async () => {
    if (!activeBatch) return;
    setWorking(true);
    const { error } = await supabase.from('attendance_import_batches' as any).delete().eq('id', activeBatch);
    if (error) toast.error(error.message);
    else { toast.success('Batch discarded'); setActiveBatch(''); }
    await fetchBatches();
    setWorking(false);
  };

  const visible = rows.filter((r) => {
    if (onlyConflicts && !r.has_existing) return false;
    if (!filter) return true;
    const f = filter.toLowerCase();
    return r.employee_name.toLowerCase().includes(f) || r.record_date.includes(f);
  });

  const counts = {
    pending: rows.filter((r) => r.row_status === 'pending').length,
    approved: rows.filter((r) => r.row_status === 'approved').length,
    rejected: rows.filter((r) => r.row_status === 'rejected').length,
    applied: rows.filter((r) => r.row_status === 'applied').length,
    conflicts: rows.filter((r) => r.has_existing).length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Attendance Import Approvals
          </CardTitle>
          <CardDescription>
            Uploaded machine data is compared with records already in the system. Review, edit where needed,
            approve, then save — approved rows are written using the normal attendance rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[280px]">
              <Select value={activeBatch} onValueChange={setActiveBatch}>
                <SelectTrigger><SelectValue placeholder="Select an upload batch" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.file_name} · {b.period_start || '—'} → {b.period_end || '—'} · {b.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Filter by name or date"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-[220px]"
            />
            <Button variant="outline" size="sm" onClick={() => setOnlyConflicts((v) => !v)}>
              {onlyConflicts ? 'Showing conflicts' : 'Show conflicts only'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { fetchBatches(); fetchRows(activeBatch); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{counts.pending}</p></div>
              <div className="rounded-lg bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Approved</p><p className="text-lg font-bold">{counts.approved}</p></div>
              <div className="rounded-lg bg-destructive/10 p-3"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-lg font-bold">{counts.rejected}</p></div>
              <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Saved</p><p className="text-lg font-bold">{counts.applied}</p></div>
              <div className="rounded-lg bg-amber-500/10 p-3"><p className="text-xs text-muted-foreground">Already in system</p><p className="text-lg font-bold">{counts.conflicts}</p></div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => bulkStatus('approved')} disabled={working || !rows.length}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Approve all
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkStatus('rejected')} disabled={working || !rows.length}>
              <XCircle className="h-4 w-4 mr-2" /> Reject all
            </Button>
            <Button size="sm" onClick={applyApproved} disabled={working || !counts.approved}>
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Save approved to attendance
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteBatch} disabled={working || !activeBatch}>
              <Trash2 className="h-4 w-4 mr-2" /> Discard batch
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Review rows {loading && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Taps</TableHead>
                  <TableHead>In system now</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead>Departure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No rows to review
                  </TableCell></TableRow>
                )}
                {visible.map((r) => (
                  <TableRow key={r.id} className={r.has_existing ? 'bg-amber-500/5' : ''}>
                    <TableCell className="font-medium whitespace-nowrap">{r.employee_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.record_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{r.punches || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {r.has_existing ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          {hhmm(r.existing_arrival) || '—'}–{hhmm(r.existing_departure) || '—'} ({r.existing_status})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">new</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="time"
                          className="w-[110px]"
                          value={hhmm(r.arrival_time)}
                          onChange={(e) => patchRow(r, { arrival_time: e.target.value || null })}
                        />
                        {r.assumed_arrival && <Badge variant="outline" className="text-[10px]">assumed</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="time"
                          className="w-[110px]"
                          value={hhmm(r.departure_time)}
                          onChange={(e) => patchRow(r, { departure_time: e.target.value || null })}
                        />
                        {r.assumed_departure && <Badge variant="outline" className="text-[10px]">assumed</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.attendance_status}
                        onValueChange={(v) => patchRow(r, { attendance_status: v })}
                      >
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="half_day">Half day</SelectItem>
                          <SelectItem value="leave">Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {r.row_status === 'applied' ? (
                        <Badge className="bg-primary text-primary-foreground">Saved</Badge>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={r.row_status === 'approved' ? 'default' : 'outline'}
                            onClick={() => setRowStatus(r, 'approved')}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={r.row_status === 'rejected' ? 'destructive' : 'outline'}
                            onClick={() => setRowStatus(r, 'rejected')}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceImportApprovals;
