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

  const runImport = async () => {
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
          record_date: d.date,
          arrival_time: d.status === 'absent' ? null : d.arrival,
          departure_time: d.status === 'absent' ? null : d.departure,
          status: d.status,
          notes: [
            `Biometric import (${fileName})`,
            d.punches.length ? `taps: ${d.punches.join(', ')}` : 'no taps',
            d.assumedArrival ? `arrival assumed ${defaultArrival}` : '',
            d.assumedDeparture ? `departure assumed ${defaultDeparture}` : '',
          ].filter(Boolean).join(' | '),
          recorded_by: employee?.email || 'IT-BIOMETRIC',
        });
      });
    });

    if (!rows.length) {
      toast.error('Nothing to import — map at least one device user to an employee');
      return;
    }

    setImporting(true);
    setProgress(0);
    let saved = 0;
    const failures: string[] = [];
    try {
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('attendance_time_records')
          .upsert(chunk as any, { onConflict: 'employee_id,record_date' });
        if (error) failures.push(error.message);
        else saved += chunk.length;
        setProgress(Math.round(((i + chunk.length) / rows.length) * 100));
      }
      if (failures.length) {
        toast.warning(`${saved} records saved, some batches failed: ${failures[0]}`);
      } else {
        toast.success(`${saved} attendance records imported successfully`);
      }
      onImported?.();
    } catch (err: any) {
      toast.error('Import failed: ' + err.message);
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
              <Button onClick={runImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing {progress}%</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Import attendance</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Existing records for the same employee and date are overwritten.
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
