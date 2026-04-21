import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseEmployees } from '@/hooks/useSupabaseEmployees';
import { toast } from 'sonner';
import { Clock, Upload, Trophy, AlertTriangle, TrendingUp, TrendingDown, Calendar, FileSpreadsheet, Printer, Filter, LogIn, LogOut, Search, Check, ChevronsUpDown, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { getStandardPrintStyles } from '@/utils/printStyles';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  record_date: string;
  arrival_time: string | null;
  departure_time: string | null;
  is_late: boolean;
  is_overtime: boolean;
  late_minutes: number;
  overtime_minutes: number;
  status: string;
  notes: string | null;
  recorded_by: string;
  support_document_url: string | null;
  support_document_name: string | null;
  created_at: string;
}

interface RankingEntry {
  employee_name: string;
  employee_id: string;
  total_days: number;
  late_count: number;
  overtime_count: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  absent_count: number;
  punctuality_score: number;
}

const AttendanceTimeManager = () => {
  const { employee } = useAuth();
  const { employees } = useSupabaseEmployees();
  const [companyWorkers, setCompanyWorkers] = useState<{ id: string; name: string; email: string; department: string; status: string }[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [entryMode, setEntryMode] = useState<'sign_in' | 'sign_out' | 'quick_entry'>('sign_in');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [recordDate, setRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [status, setStatus] = useState('present');
  const [notes, setNotes] = useState('');

  // Report filter
  const [reportPeriod, setReportPeriod] = useState('month');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

  // Records filter state
  const [filterDateFrom, setFilterDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterDateTo, setFilterDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterEmployee, setFilterEmployee] = useState('');

  useEffect(() => {
    fetchRecords();
    fetchCompanyWorkers();
  }, []);

  useEffect(() => {
    if (records.length > 0) computeRankings();
  }, [records, reportPeriod]);

  const fetchCompanyWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, employee_id, department, status, phone')
        .eq('status', 'Active')
        .order('name');
      if (error) throw error;
      setCompanyWorkers((data || []).map((w: any) => ({
        id: `company_${w.id}`,
        name: w.name,
        email: w.employee_id,
        department: w.department,
        status: w.status,
      })));
    } catch (err: any) {
      console.error('Failed to fetch company workers:', err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_time_records')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      setRecords((data as any[]) || []);
    } catch (err: any) {
      toast.error('Failed to fetch records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    const person = allAttendanceList.find(e => e.id === selectedEmployee);
    if (!person) return;

    setSaving(true);
    try {
      if (entryMode === 'quick_entry') {
        // Quick entry: record both arrival and departure at once
        if (!arrivalTime || !departureTime) {
          toast.error('Please enter both arrival and departure times');
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('attendance_time_records')
          .upsert({
            employee_id: person.id,
            employee_name: person.name,
            employee_email: person.email,
            record_date: recordDate,
            arrival_time: arrivalTime,
            departure_time: departureTime,
            status: 'present',
            notes: notes || null,
            recorded_by: employee?.email || 'IT',
          } as any, { onConflict: 'employee_id,record_date' });

        if (error) throw error;
        toast.success(`Full day recorded for ${person.name}: ${arrivalTime} — ${departureTime}`);
      } else if (entryMode === 'sign_in') {
        if (!arrivalTime) {
          toast.error('Please enter arrival time');
          setSaving(false);
          return;
        }
        // Morning: create record with arrival time only
        const { error } = await supabase
          .from('attendance_time_records')
          .upsert({
            employee_id: person.id,
            employee_name: person.name,
            employee_email: person.email,
            record_date: recordDate,
            arrival_time: arrivalTime,
            status: 'present',
            notes: notes || null,
            recorded_by: employee?.email || 'IT',
          } as any, { onConflict: 'employee_id,record_date' });

        if (error) throw error;
        toast.success(`Sign-in recorded for ${person.name} at ${arrivalTime}`);
      } else {
        if (!departureTime) {
          toast.error('Please enter departure time');
          setSaving(false);
          return;
        }
        // Evening: update existing record with departure time
        // First check if a sign-in record exists
        const { data: existing } = await supabase
          .from('attendance_time_records')
          .select('id, arrival_time')
          .eq('employee_id', person.id)
          .eq('record_date', recordDate)
          .maybeSingle();

        if (existing) {
          // Update with departure time
          const { error } = await supabase
            .from('attendance_time_records')
            .update({
              departure_time: departureTime,
              notes: notes || existing.arrival_time ? null : '[FLAGGED] Signed out without signing in - needs IT review',
              recorded_by: employee?.email || 'IT',
            } as any)
            .eq('id', existing.id);

          if (error) throw error;
          
          if (!existing.arrival_time) {
            toast.warning(`Sign-out recorded for ${person.name} but NO sign-in found — flagged for review`);
          } else {
            toast.success(`Sign-out recorded for ${person.name} at ${departureTime}`);
          }
        } else {
          // No sign-in record exists — create with departure only (flagged)
          const { error } = await supabase
            .from('attendance_time_records')
            .upsert({
              employee_id: person.id,
              employee_name: person.name,
              employee_email: person.email,
              record_date: recordDate,
              departure_time: departureTime,
              status: 'present',
              notes: '[FLAGGED] Signed out without signing in - needs IT review',
              recorded_by: employee?.email || 'IT',
            } as any, { onConflict: 'employee_id,record_date' });

          if (error) throw error;
          toast.warning(`Sign-out recorded for ${person.name} — NO sign-in found, flagged for review`);
        }
      }

      setSelectedEmployee('');
      setArrivalTime('');
      setDepartureTime('');
      setNotes('');
      fetchRecords();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const filePath = `${format(new Date(), 'yyyy-MM')}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attendance-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('attendance-documents')
        .getPublicUrl(filePath);

      toast.success(`Document "${file.name}" uploaded successfully`);
      // Store reference if a record is selected
      if (selectedEmployee && recordDate) {
        await supabase
          .from('attendance_time_records')
          .update({
            support_document_url: urlData.publicUrl,
            support_document_name: file.name,
          } as any)
          .eq('employee_id', selectedEmployee)
          .eq('record_date', recordDate);
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const computeRankings = () => {
    return computeRankingsImpl();
  };

  const downloadCsvTemplate = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Headers match attendance_time_records schema. Computed columns
    // (is_late, is_overtime, late_minutes, overtime_minutes) are auto-generated by the DB.
    // Valid status values: present | absent | half_day | leave
    const header = 'employee_id,employee_name,employee_email,record_date,arrival_time,departure_time,standard_start,standard_end,status,notes';

    const rows = allAttendanceList.length > 0
      ? allAttendanceList
          .map(p => `${p.id},${p.name},${p.email},${today},08:00,17:30,08:00,17:30,present,`)
          .join('\n')
      : `EMP001,John Doe,john@example.com,${today},08:00,17:30,08:00,17:30,present,\nEMP002,Jane Smith,jane@example.com,${today},08:15,17:30,08:00,17:30,present,Late by 15 min`;

    const csv = `${header}\n${rows}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_template_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Template downloaded with ${allAttendanceList.length} employees. Fill in and re-upload.`);
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      // simple CSV split (no quoted-comma support beyond basics)
      const cols: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
        else cur += ch;
      }
      cols.push(cur);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
      return obj;
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    let success = 0, failed = 0, skipped = 0;
    const errors: string[] = [];
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.error('CSV is empty or invalid');
        return;
      }
      for (const row of rows) {
        const name = row['employee_name'];
        const date = row['record_date'];
        if (!name || !date) { skipped++; continue; }
        const person = allAttendanceList.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (!person) {
          failed++;
          errors.push(`${name}: not found`);
          continue;
        }
        const payload: any = {
          employee_id: person.id,
          employee_name: person.name,
          employee_email: person.email,
          record_date: date,
          arrival_time: row['arrival_time'] || null,
          departure_time: row['departure_time'] || null,
          status: row['status'] || 'present',
          notes: row['notes'] || null,
          recorded_by: employee?.email || 'IT-CSV',
        };
        const { error } = await supabase
          .from('attendance_time_records')
          .upsert(payload, { onConflict: 'employee_id,record_date' });
        if (error) { failed++; errors.push(`${name}: ${error.message}`); }
        else success++;
      }
      toast.success(`CSV import: ${success} saved, ${failed} failed, ${skipped} skipped`);
      if (errors.length > 0) console.warn('CSV import errors:', errors);
      fetchRecords();
    } catch (err: any) {
      toast.error('CSV import failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const computeRankingsImpl = () => {
    const now = new Date();
    let start: Date, end: Date;
    if (reportPeriod === 'week') {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    const filtered = records.filter(r => {
      const d = new Date(r.record_date);
      return d >= start && d <= end;
    });

    const grouped: Record<string, RankingEntry> = {};
    filtered.forEach(r => {
      if (!grouped[r.employee_id]) {
        grouped[r.employee_id] = {
          employee_name: r.employee_name,
          employee_id: r.employee_id,
          total_days: 0,
          late_count: 0,
          overtime_count: 0,
          total_late_minutes: 0,
          total_overtime_minutes: 0,
          absent_count: 0,
          punctuality_score: 100,
        };
      }
      const g = grouped[r.employee_id];
      g.total_days++;
      if (r.status === 'absent') g.absent_count++;
      if (r.is_late) { g.late_count++; g.total_late_minutes += r.late_minutes || 0; }
      if (r.is_overtime) { g.overtime_count++; g.total_overtime_minutes += r.overtime_minutes || 0; }
    });

    // Calculate punctuality score: 100 - (late_count * 5) - (absent_count * 15)
    Object.values(grouped).forEach(g => {
      g.punctuality_score = Math.max(0, 100 - (g.late_count * 5) - (g.absent_count * 15));
    });

    setRankings(Object.values(grouped).sort((a, b) => b.punctuality_score - a.punctuality_score));
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white">🥇 Best</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white">🥈 2nd</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600 text-white">🥉 3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };

  const getCautionStatus = (entry: RankingEntry) => {
    if (entry.absent_count >= 3) return <Badge variant="destructive">⚠️ High Absence</Badge>;
    if (entry.late_count >= 5) return <Badge variant="destructive">⚠️ Frequent Late</Badge>;
    if (entry.punctuality_score < 50) return <Badge variant="destructive">⚠️ Caution</Badge>;
    if (entry.total_overtime_minutes > 600) return <Badge className="bg-blue-600 text-white">⏰ High Overtime</Badge>;
    return <Badge variant="secondary">✓ Good</Badge>;
  };

  const activeEmployees = employees.filter(e => e.status === 'Active' && !e.is_training_account);
  // Deduplicate: use Supabase employees as primary, only add company workers not already present by name
  const supabaseNames = new Set(activeEmployees.map(e => e.name?.toLowerCase().trim()));
  const uniqueCompanyWorkers = companyWorkers.filter(w => !supabaseNames.has(w.name?.toLowerCase().trim()));
  const allAttendanceList = [
    ...activeEmployees.map(e => ({ id: e.id, name: e.name, email: e.email, department: e.department, isCompanyWorker: false })),
    ...uniqueCompanyWorkers.map(w => ({ id: w.id, name: w.name, email: w.email, department: w.department, isCompanyWorker: true })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const getGroupedFilteredRecords = (): Record<string, AttendanceRecord[]> => {
    const filtered = records.filter(r => {
      const inRange = r.record_date >= filterDateFrom && r.record_date <= filterDateTo;
      const matchesEmployee = !filterEmployee || r.employee_name.toLowerCase().includes(filterEmployee.toLowerCase());
      return inRange && matchesEmployee;
    });
    const grouped: Record<string, AttendanceRecord[]> = {};
    filtered.forEach(r => {
      if (!grouped[r.record_date]) grouped[r.record_date] = [];
      grouped[r.record_date].push(r);
    });
    // Sort dates descending
    const sorted: Record<string, AttendanceRecord[]> = {};
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(k => { sorted[k] = grouped[k]; });
    return sorted;
  };

  const handlePrintRecords = () => {
    const grouped = getGroupedFilteredRecords();
    const rows = Object.entries(grouped).map(([date, dayRecords]) => {
      const dateFormatted = format(parseISO(date), 'EEEE, dd MMM yyyy');
      const tableRows = dayRecords.map(r => `
        <tr>
          <td>${r.employee_name}</td>
          <td>${r.arrival_time || '—'}</td>
          <td>${r.departure_time || '—'}</td>
          <td>${r.status}</td>
          <td>${r.is_late ? r.late_minutes + ' min' : '—'}</td>
          <td>${r.is_overtime ? r.overtime_minutes + ' min' : '—'}</td>
        </tr>
      `).join('');
      return `
        <div class="content-section">
          <div class="section-title">${dateFormatted} — ${dayRecords.length} record(s)</div>
          <table>
            <thead><tr><th>Employee</th><th>Arrival</th><th>Departure</th><th>Status</th><th>Late</th><th>Overtime</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Attendance Records</title><style>${getStandardPrintStyles()}</style></head>
      <body>
        <div class="print-header">
          <div class="company-name">Great Agro Coffee Limited</div>
          <div class="document-title">Attendance Records Report</div>
          <div class="document-info">Period: ${filterDateFrom} to ${filterDateTo}${filterEmployee ? ' | Employee: ' + filterEmployee : ''}</div>
          <div class="document-info">Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        </div>
        ${rows}
        <div class="footer">This is a system-generated report.</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="entry" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entry">
            <Clock className="h-4 w-4 mr-2" /> Record Entry
          </TabsTrigger>
          <TabsTrigger value="records">
            <Calendar className="h-4 w-4 mr-2" /> Records
          </TabsTrigger>
          <TabsTrigger value="rankings">
            <Trophy className="h-4 w-4 mr-2" /> Rankings & Reports
          </TabsTrigger>
        </TabsList>

        {/* ENTRY TAB */}
        <TabsContent value="entry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-sky-600" />
                Record Employee Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sign In / Sign Out / Quick Entry Mode Toggle */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={entryMode === 'sign_in' ? 'default' : 'outline'}
                  onClick={() => setEntryMode('sign_in')}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" /> Morning Sign-In
                </Button>
                <Button
                  variant={entryMode === 'sign_out' ? 'default' : 'outline'}
                  onClick={() => setEntryMode('sign_out')}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" /> Evening Sign-Out
                </Button>
                <Button
                  variant={entryMode === 'quick_entry' ? 'default' : 'outline'}
                  onClick={() => setEntryMode('quick_entry')}
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Zap className="h-4 w-4" /> Quick Full-Day Entry
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={employeeSearchOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedEmployee
                          ? allAttendanceList.find(p => p.id === selectedEmployee)?.name || 'Select employee'
                          : 'Search & select employee...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                          className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Type to search employee..."
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-[300px]">
                        <div className="p-1">
                          {allAttendanceList
                            .filter(person =>
                              !employeeSearchTerm ||
                              person.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                              person.department.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                              person.email.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                            )
                            .map(person => {
                              const todayRecord = records.find(r => r.employee_id === person.id && r.record_date === recordDate);
                              const signedIn = todayRecord?.arrival_time;
                              const signedOut = todayRecord?.departure_time;
                              const statusLabel = signedIn && signedOut ? ' ✓ Full day'
                                : entryMode === 'sign_in' && signedIn ? ' ✓ Signed in'
                                : entryMode === 'sign_out' && signedOut ? ' ✓ Signed out'
                                : entryMode === 'sign_out' && !signedIn ? ' ⚠ No sign-in'
                                : '';
                              return (
                                <div
                                  key={person.id}
                                  className={cn(
                                    "flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent",
                                    selectedEmployee === person.id && "bg-accent"
                                  )}
                                  onClick={() => {
                                    setSelectedEmployee(person.id);
                                    setEmployeeSearchOpen(false);
                                    setEmployeeSearchTerm('');
                                  }}
                                >
                                  <Check className={cn("h-4 w-4", selectedEmployee === person.id ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{person.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {person.department} {person.isCompanyWorker ? '(Company)' : ''}{statusLabel}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          {allAttendanceList.filter(person =>
                            !employeeSearchTerm ||
                            person.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                            person.department.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                            person.email.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                          ).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No employee found</p>
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} />
                </div>

                {entryMode === 'quick_entry' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Arrival Time</Label>
                      <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} step="60" />
                      <p className="text-xs text-muted-foreground">Standard: 08:00. After 08:00 is marked late.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Departure Time</Label>
                      <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} step="60" />
                      <p className="text-xs text-muted-foreground">Standard: 17:30. System calculates overtime.</p>
                    </div>
                  </>
                ) : entryMode === 'sign_in' ? (
                  <div className="space-y-2">
                    <Label>Arrival Time</Label>
                    <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} step="60" />
                    <p className="text-xs text-muted-foreground">Standard: 08:00. After 08:00 is marked late.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Departure Time</Label>
                    <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} step="60" />
                    <p className="text-xs text-muted-foreground">Standard: 17:30. System calculates overtime.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                  {entryMode === 'quick_entry' ? <Zap className="h-4 w-4" /> : entryMode === 'sign_in' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  {saving ? 'Saving...' : entryMode === 'quick_entry' ? 'Record Full Day' : entryMode === 'sign_in' ? 'Record Sign-In' : 'Record Sign-Out'}
                </Button>

                <div className="relative">
                  <Button variant="outline" disabled={uploading} className="gap-2">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Support Document'}
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf,.png,.jpg"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleDocumentUpload}
                  />
                </div>

                <Button variant="outline" onClick={downloadCsvTemplate} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> Download CSV Template
                </Button>

                <div className="relative">
                  <Button variant="outline" disabled={uploading} className="gap-2 border-sky-300 text-sky-700 hover:bg-sky-50">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Importing...' : 'Bulk Import CSV'}
                  </Button>
                  <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleCsvUpload}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-2 rounded border bg-muted/20">
                <strong>CSV Bulk Import:</strong> Download the template, fill in attendance for multiple employees/dates, then upload. Columns: <code>employee_name, record_date (YYYY-MM-DD), arrival_time (HH:MM), departure_time (HH:MM), status, notes</code>. Existing records for the same employee+date will be updated.
              </div>

              {/* Today's sign-in summary */}
              {(() => {
                const todayRecords = records.filter(r => r.record_date === recordDate);
                const signedIn = todayRecords.filter(r => r.arrival_time).length;
                const notSignedIn = allAttendanceList.length - signedIn;
                return (
                  <div className="p-3 rounded-lg border bg-muted/30 text-sm">
                    <strong>Today ({recordDate}):</strong> {signedIn} signed in, {notSignedIn} not yet signed in, {todayRecords.filter(r => r.departure_time).length} signed out
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECORDS TAB */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Records
                </span>
                <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintRecords}>
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
                <Filter className="h-4 w-4 text-muted-foreground mt-6" />
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-40 h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-40 h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Employee</Label>
                  <Input placeholder="Filter by name..." value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="w-48 h-9" />
                </div>
              </div>

              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getGroupedFilteredRecords()).map(([date, dayRecords]) => (
                    <div key={date} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 font-semibold text-sm flex items-center justify-between">
                        <span>{format(parseISO(date), 'EEEE, dd MMM yyyy')}</span>
                        <Badge variant="secondary">{dayRecords.length} records</Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Arrival</TableHead>
                            <TableHead>Departure</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Late</TableHead>
                            <TableHead>Overtime</TableHead>
                            <TableHead>Document</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayRecords.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.employee_name}</TableCell>
                              <TableCell>{r.arrival_time || '—'}</TableCell>
                              <TableCell>{r.departure_time || '—'}</TableCell>
                              <TableCell>
                                <Badge variant={r.status === 'present' ? 'default' : r.status === 'absent' ? 'destructive' : 'secondary'}>
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {r.is_late ? <span className="text-destructive font-medium">{r.late_minutes}min</span> : '—'}
                              </TableCell>
                              <TableCell>
                                {r.is_overtime ? <span className="text-blue-600 font-medium">{r.overtime_minutes}min</span> : '—'}
                              </TableCell>
                              <TableCell>
                                {r.support_document_name ? (
                                  <a href={r.support_document_url || '#'} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                                    <FileSpreadsheet className="h-4 w-4 inline mr-1" />
                                    {r.support_document_name}
                                  </a>
                                ) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                  {Object.keys(getGroupedFilteredRecords()).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No records found for the selected filters.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FLAGGED RECORDS - Missing Sign-in */}
        {(() => {
          const flagged = records.filter(r => r.notes?.includes('[FLAGGED]') || (r.departure_time && !r.arrival_time));
          if (flagged.length === 0) return null;
          return (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  Flagged Records — Missing Sign-in ({flagged.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  These employees signed out but never signed in. Please review and enter their arrival times.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flagged.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.record_date}</TableCell>
                        <TableCell>{r.employee_name}</TableCell>
                        <TableCell>{r.departure_time || '—'}</TableCell>
                        <TableCell className="text-orange-600 text-sm">{r.notes || 'No sign-in recorded'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })()}

        {/* RANKINGS TAB */}
        <TabsContent value="rankings" className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Period:</Label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Attendance</p>
                  <p className="font-bold">{rankings[0]?.employee_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{rankings[0] ? `Score: ${rankings[0].punctuality_score}` : ''}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Most Late</p>
                  <p className="font-bold">
                    {[...rankings].sort((a, b) => b.late_count - a.late_count)[0]?.employee_name || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[...rankings].sort((a, b) => b.late_count - a.late_count)[0]?.late_count || 0} times
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Most Overtime</p>
                  <p className="font-bold">
                    {[...rankings].sort((a, b) => b.total_overtime_minutes - a.total_overtime_minutes)[0]?.employee_name || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[...rankings].sort((a, b) => b.total_overtime_minutes - a.total_overtime_minutes)[0]?.total_overtime_minutes || 0} min
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Caution List</p>
                  <p className="font-bold">{rankings.filter(r => r.punctuality_score < 50).length} employees</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Employee Attendance Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Late Mins</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>OT Mins</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((entry, idx) => (
                      <TableRow key={entry.employee_id}>
                        <TableCell>{getRankBadge(idx + 1)}</TableCell>
                        <TableCell className="font-medium">{entry.employee_name}</TableCell>
                        <TableCell>{entry.total_days}</TableCell>
                        <TableCell className={entry.late_count > 0 ? 'text-destructive font-medium' : ''}>
                          {entry.late_count}
                        </TableCell>
                        <TableCell>{entry.total_late_minutes}</TableCell>
                        <TableCell className={entry.overtime_count > 0 ? 'text-blue-600 font-medium' : ''}>
                          {entry.overtime_count}
                        </TableCell>
                        <TableCell>{entry.total_overtime_minutes}</TableCell>
                        <TableCell className={entry.absent_count > 0 ? 'text-destructive font-medium' : ''}>
                          {entry.absent_count}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.punctuality_score >= 80 ? 'default' : entry.punctuality_score >= 50 ? 'secondary' : 'destructive'}>
                            {entry.punctuality_score}
                          </Badge>
                        </TableCell>
                        <TableCell>{getCautionStatus(entry)}</TableCell>
                      </TableRow>
                    ))}
                    {rankings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          No data for this period yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceTimeManager;
