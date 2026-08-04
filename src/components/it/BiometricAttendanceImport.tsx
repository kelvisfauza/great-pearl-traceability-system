import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  parseMachineWorkbook,
  matchEmployee,
  type ParsedMachineFile,
  type ParsedDevicePerson,
} from '@/utils/biometricAttendanceParser';

interface PersonOption {
  id: string;
  name: string;
  email: string;
  department?: string;
}

interface Props {
  people: PersonOption[];
  onImported?: () => void;
}

const UNMATCHED = '__skip__';

const BiometricAttendanceImport = ({ people, onImported }: Props) => {
  const { employee } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [defaultArrival, setDefaultArrival] = useState('09:00');
  const [defaultDeparture, setDefaultDeparture] = useState('17:00');
  const [includeWeekends, setIncludeWeekends] = useState(false);
  const [markAbsent, setMarkAbsent] = useState(true);

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedMachineFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const result = parseMachineWorkbook(buf, {
        defaultArrival,
        defaultDeparture,
        middayCutoffHour: 12,
        includeWeekends,
      });
      if (!result.people.length) {
        toast.error('No attendance blocks found. Export the "Employee Attendance Record" report from the machine.');
        return;
      }
      const auto: Record<string, string> = {};
      result.people.forEach((p) => {
        const found = matchEmployee(p.deviceName, people);
        auto[p.deviceUserId + '|' + p.deviceName] = found ? found.id : UNMATCHED;
      });
      setMapping(auto);
      setParsed(result);
      setFileName(file.name);
      toast.success(`Parsed ${result.people.length} device users (${result.periodStart} → ${result.periodEnd})`);
    } catch (err: any) {
      toast.error('Could not read file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const key = (p: ParsedDevicePerson) => p.deviceUserId + '|' + p.deviceName;

  const stats = useMemo(() => {
    if (!parsed) return null;
    let present = 0, absent = 0, assumedIn = 0, assumedOut = 0, mapped = 0;
    parsed.people.forEach((p) => {
      if (mapping[key(p)] && mapping[key(p)] !== UNMATCHED) mapped++;
      p.days.forEach((d) => {
        if (d.status === 'absent') absent++;
        else {
          present++;
          if (d.assumedArrival) assumedIn++;
          if (d.assumedDeparture) assumedOut++;
        }
      });
    });
    return { present, absent, assumedIn, assumedOut, mapped, total: parsed.people.length };
  }, [parsed, mapping]);

  const stageForApproval = async () => {
    if (!parsed) return;
    const rows: any[] = [];
    parsed.people.forEach((p) => {
      const personId = mapping[key(p)];
      if (!personId || personId === UNMATCHED) return;
      const person = people.find((x) => x.id === personId);
      if (!person) return;
      p.days.forEach((d) => {
        if (d.status === 'absent' && !markAbsent) return;
        if (d.status === 'absent' && d.isWeekend) return;
        rows.push({
          employee_id: person.id,
          employee_name: person.name,
          employee_email: person.email,
          device_user_id: p.deviceUserId,
          device_name: p.deviceName,
          record_date: d.date,
          punches: d.punches.join(', '),
          arrival_time: d.status === 'absent' ? null : d.arrival,
          departure_time: d.status === 'absent' ? null : d.departure,
          attendance_status: d.status,
          assumed_arrival: d.assumedArrival,
          assumed_departure: d.assumedDeparture,
          notes: `Biometric import (${fileName})`,
        });
      });
    });

    if (!rows.length) {
      toast.error('Nothing to submit — map at least one device user to an employee');
      return;
    }

    setImporting(true);
    setProgress(0);
    try {
      // 1) Compare against what is already in the system for these employees/dates
      const dates = rows.map((r) => r.record_date).sort();
      const empIds = [...new Set(rows.map((r) => r.employee_id))];
      const existingMap = new Map<string, any>();
      const idChunk = 40;
      for (let i = 0; i < empIds.length; i += idChunk) {
        const { data } = await supabase
          .from('attendance_time_records')
          .select('employee_id, record_date, arrival_time, departure_time, status')
          .in('employee_id', empIds.slice(i, i + idChunk))
          .gte('record_date', dates[0])
          .lte('record_date', dates[dates.length - 1]);
        (data || []).forEach((r: any) => existingMap.set(`${r.employee_id}|${r.record_date}`, r));
      }
      rows.forEach((r) => {
        const ex = existingMap.get(`${r.employee_id}|${r.record_date}`);
        if (ex) {
          r.has_existing = true;
          r.existing_arrival = ex.arrival_time;
          r.existing_departure = ex.departure_time;
          r.existing_status = ex.status;
        }
      });
      setProgress(25);

      // 2) Create the batch awaiting IT approval
      const { data: batch, error: batchErr } = await supabase
        .from('attendance_import_batches' as any)
        .insert({
          file_name: fileName,
          period_start: parsed.periodStart || null,
          period_end: parsed.periodEnd || null,
          uploaded_by: employee?.email || 'IT',
          total_rows: rows.length,
          status: 'pending',
        } as any)
        .select()
        .single();
      if (batchErr) throw batchErr;

      // 3) Stage the rows
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize).map((r) => ({ ...r, batch_id: (batch as any).id }));
        const { error } = await supabase.from('attendance_import_rows' as any).insert(chunk as any);
        if (error) throw error;
        setProgress(25 + Math.round(((i + chunk.length) / rows.length) * 75));
      }

      const conflicts = rows.filter((r) => r.has_existing).length;
      toast.success(
        `${rows.length} rows sent for approval${conflicts ? ` — ${conflicts} already exist in the system and will be overwritten if approved` : ''}`,
      );
      setParsed(null);
      setFileName('');
      onImported?.();
    } catch (err: any) {
      toast.error('Could not submit for approval: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Biometric Machine Import
          </CardTitle>
          <CardDescription>
            Upload the machine's <strong>Employee Attendance Record</strong> export (.xls, .xlsx or .csv).
            The first tap of the day becomes the arrival and the last tap becomes the departure. Missing
            morning taps default to {defaultArrival}, missing evening taps to {defaultDeparture}, and days
            with no taps at all are recorded as absent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Assumed arrival (no morning tap)</Label>
              <Input type="time" value={defaultArrival} onChange={(e) => setDefaultArrival(e.target.value)} />
            </div>
            <div>
              <Label>Assumed departure (no evening tap)</Label>
              <Input type="time" value={defaultDeparture} onChange={(e) => setDefaultDeparture(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Include weekends</Label>
              <Switch checked={includeWeekends} onCheckedChange={setIncludeWeekends} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm">Record absent days</Label>
              <Switch checked={markAbsent} onCheckedChange={setMarkAbsent} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              className="hidden"
              onChange={handleFile}
            />
            <Button onClick={() => fileRef.current?.click()} variant="outline">
              <Upload className="h-4 w-4 mr-2" /> Choose machine export
            </Button>
            {fileName && <Badge variant="secondary">{fileName}</Badge>}
            {parsed && (
              <Badge variant="outline">
                {parsed.periodStart} → {parsed.periodEnd}
              </Badge>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Device users</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="text-lg font-bold">{stats.mapped}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Present days</p>
                <p className="text-lg font-bold">{stats.present}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-xs text-muted-foreground">Absent days</p>
                <p className="text-lg font-bold">{stats.absent}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Assumed in / out</p>
                <p className="text-lg font-bold">{stats.assumedIn} / {stats.assumedOut}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match device users to employees</CardTitle>
            <CardDescription>Unmatched users are skipped during import.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device user</TableHead>
                    <TableHead>Dept (machine)</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>System employee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.people.map((p) => {
                    const k = key(p);
                    const presentDays = p.days.filter((d) => d.status === 'present').length;
                    return (
                      <TableRow key={k}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {mapping[k] && mapping[k] !== UNMATCHED ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            {p.deviceName}
                            <span className="text-xs text-muted-foreground">#{p.deviceUserId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.department}</TableCell>
                        <TableCell className="text-sm">
                          {presentDays} present / {p.days.length - presentDays} absent
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping[k] || UNMATCHED}
                            onValueChange={(v) => setMapping((m) => ({ ...m, [k]: v }))}
                          >
                            <SelectTrigger className="w-[240px]">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover z-50">
                              <SelectItem value={UNMATCHED}>— Skip this user —</SelectItem>
                              {people.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="mt-4 flex items-center gap-3">
              <Button onClick={stageForApproval} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing {progress}%</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Send for IT approval</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Records are compared with what is already in the system, then queued in the Approvals tab for review before saving.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (first matched user)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Taps</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(parsed.people.find((p) => mapping[key(p)] && mapping[key(p)] !== UNMATCHED) || parsed.people[0]).days.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.punches.join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        {d.arrival || '—'}{' '}
                        {d.assumedArrival && <Badge variant="outline" className="text-xs">assumed</Badge>}
                      </TableCell>
                      <TableCell>
                        {d.departure || '—'}{' '}
                        {d.assumedDeparture && <Badge variant="outline" className="text-xs">assumed</Badge>}
                      </TableCell>
                      <TableCell>
                        {d.status === 'absent'
                          ? <Badge variant="destructive">Absent</Badge>
                          : <Badge variant="secondary">Present</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BiometricAttendanceImport;
