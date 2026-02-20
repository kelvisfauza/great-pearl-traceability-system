import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseEmployees } from '@/hooks/useSupabaseEmployees';
import { toast } from 'sonner';
import { Clock, Upload, Trophy, AlertTriangle, TrendingUp, TrendingDown, Calendar, FileSpreadsheet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

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
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [recordDate, setRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [arrivalTime, setArrivalTime] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [status, setStatus] = useState('present');
  const [notes, setNotes] = useState('');

  // Report filter
  const [reportPeriod, setReportPeriod] = useState('month');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);

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
        .from('company_employees')
        .select('id, full_name, employee_id, department, status, phone')
        .eq('status', 'Active')
        .order('full_name');
      if (error) throw error;
      setCompanyWorkers((data || []).map(w => ({
        id: `company_${w.id}`,
        name: w.full_name,
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
      const { error } = await supabase
        .from('attendance_time_records')
        .upsert({
          employee_id: person.id,
          employee_name: person.name,
          employee_email: person.email,
          record_date: recordDate,
          arrival_time: arrivalTime || null,
          departure_time: departureTime || null,
          status,
          notes: notes || null,
          recorded_by: employee?.email || 'IT',
        } as any, { onConflict: 'employee_id,record_date' });

      if (error) throw error;
      toast.success(`Attendance recorded for ${person.name}`);
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
  const allAttendanceList = [
    ...activeEmployees.map(e => ({ id: e.id, name: e.name, email: e.email, department: e.department, isCompanyWorker: false })),
    ...companyWorkers.map(w => ({ id: w.id, name: w.name, email: w.email, department: w.department, isCompanyWorker: true })),
  ].sort((a, b) => a.name.localeCompare(b.name));

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAttendanceList.map(person => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} — {person.department} {person.isCompanyWorker ? '(Company)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={recordDate} onChange={e => setRecordDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Arrival Time</Label>
                  <Input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Departure Time</Label>
                  <Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                      <SelectItem value="leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Attendance'}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECORDS TAB */}
        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
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
                      {records.slice(0, 100).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.record_date}</TableCell>
                          <TableCell>{r.employee_name}</TableCell>
                          <TableCell>{r.arrival_time || '—'}</TableCell>
                          <TableCell>{r.departure_time || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'present' ? 'default' : r.status === 'absent' ? 'destructive' : 'secondary'}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.is_late ? (
                              <span className="text-destructive font-medium">{r.late_minutes}min</span>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            {r.is_overtime ? (
                              <span className="text-blue-600 font-medium">{r.overtime_minutes}min</span>
                            ) : '—'}
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
                      {records.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No attendance records yet. Start recording above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
