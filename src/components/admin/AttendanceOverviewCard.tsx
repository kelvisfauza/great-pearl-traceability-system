import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Trophy, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface RankingSummary {
  employee_name: string;
  late_count: number;
  overtime_count: number;
  total_days: number;
  punctuality_score: number;
}

const AttendanceOverviewCard = () => {
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data } = useQuery({
    queryKey: ['admin-attendance-overview', monthStart],
    queryFn: async () => {
      const { data: records } = await supabase
        .from('attendance_time_records')
        .select('employee_name, employee_id, is_late, is_overtime, late_minutes, overtime_minutes, status')
        .gte('record_date', monthStart)
        .lte('record_date', monthEnd);

      if (!records?.length) return null;

      // Build per-employee stats
      const map = new Map<string, RankingSummary>();
      records.forEach((r) => {
        const existing = map.get(r.employee_id) || {
          employee_name: r.employee_name,
          late_count: 0,
          overtime_count: 0,
          total_days: 0,
          punctuality_score: 100,
        };
        existing.total_days++;
        if (r.is_late) existing.late_count++;
        if (r.is_overtime) existing.overtime_count++;
        map.set(r.employee_id, existing);
      });

      const entries = Array.from(map.values()).map((e) => ({
        ...e,
        punctuality_score: Math.max(0, 100 - e.late_count * 5),
      }));

      const sorted = [...entries].sort((a, b) => b.punctuality_score - a.punctuality_score);
      const totalRecords = records.length;
      const totalLate = records.filter((r) => r.is_late).length;
      const totalOvertime = records.filter((r) => r.is_overtime).length;
      const cautionList = sorted.filter((e) => e.punctuality_score < 60);

      return {
        totalRecords,
        totalLate,
        totalOvertime,
        topPerformers: sorted.slice(0, 3),
        cautionList: cautionList.slice(0, 3),
        employeeCount: entries.length,
      };
    },
  });

  if (!data) return null;

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Attendance Overview — {format(now, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Records</p>
              <p className="text-lg font-bold">{data.totalRecords}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Late</p>
              <p className="text-lg font-bold">{data.totalLate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Overtime</p>
              <p className="text-lg font-bold">{data.totalOvertime}</p>
            </div>
          </div>
        </div>

        {/* Top performers */}
        {data.topPerformers.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-500" /> Best Attendance
            </p>
            <div className="space-y-1.5">
              {data.topPerformers.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{e.employee_name}</span>
                  <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                    {e.punctuality_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caution list */}
        {data.cautionList.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Caution List
            </p>
            <div className="space-y-1.5">
              {data.cautionList.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{e.employee_name}</span>
                  <Badge variant="outline" className="text-destructive border-destructive text-xs">
                    {e.punctuality_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceOverviewCard;
