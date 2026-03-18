import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Target } from "lucide-react";

const PerformanceComplianceTab = () => {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['hr-performance'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, name, email, department, position, status').eq('status', 'Active');
      if (error) throw error;
      return data;
    }
  });

  const { data: attendance } = useQuery({
    queryKey: ['hr-attendance-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('employee_email, status');
      if (error) throw error;
      return data;
    }
  });

  const { data: reports } = useQuery({
    queryKey: ['hr-daily-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_daily_reports').select('employee_email, status');
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Compute per-employee performance
  const performance = employees?.map((emp: any) => {
    const empAttendance = attendance?.filter(a => a.employee_email === emp.email) || [];
    const presentDays = empAttendance.filter(a => a.status === 'present').length;
    const totalDays = empAttendance.length;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(0) : '—';
    const reportsCount = reports?.filter(r => r.employee_email === emp.email).length || 0;

    return { ...emp, presentDays, totalDays, attendanceRate, reportsCount };
  }).sort((a, b) => parseFloat(b.attendanceRate || '0') - parseFloat(a.attendanceRate || '0')) || [];

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" />Employee Performance & Compliance</h3>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Position</TableHead><TableHead>Attendance</TableHead><TableHead>Reports</TableHead><TableHead>Rating</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {performance.map((p: any) => {
                const rate = parseFloat(p.attendanceRate);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell className="text-sm">{p.position}</TableCell>
                    <TableCell>
                      <Badge variant={rate >= 90 ? 'secondary' : rate >= 70 ? 'outline' : 'destructive'}>
                        {p.attendanceRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>{p.reportsCount}</TableCell>
                    <TableCell>
                      <Badge variant={rate >= 90 ? 'secondary' : rate >= 70 ? 'outline' : 'destructive'}>
                        {rate >= 90 ? 'Excellent' : rate >= 70 ? 'Good' : rate >= 50 ? 'Fair' : 'Poor'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceComplianceTab;
