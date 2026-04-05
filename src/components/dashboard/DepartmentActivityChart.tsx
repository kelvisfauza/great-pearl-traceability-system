import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
];

const DepartmentActivityChart = () => {
  const [deptData, setDeptData] = useState<{ name: string; value: number }[]>([]);
  const [approvalData, setApprovalData] = useState<{ pending: number; approved: number; rejected: number }>({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [{ data: employees }, { data: approvals }] = await Promise.all([
        supabase.from('employees').select('department, status').eq('status', 'Active'),
        supabase.from('approval_requests').select('status').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      // Department distribution
      const deptMap: Record<string, number> = {};
      employees?.forEach(e => {
        const d = e.department || 'Other';
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
      setDeptData(Object.entries(deptMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7));

      // Approval stats
      let pending = 0, approved = 0, rejected = 0;
      approvals?.forEach(a => {
        if (a.status === 'Pending') pending++;
        else if (a.status === 'Approved' || a.status === 'Fully Approved') approved++;
        else if (a.status === 'Rejected') rejected++;
      });
      setApprovalData({ pending, approved, rejected });
    };
    fetch();
  }, []);

  const approvalChartData = [
    { name: 'Pending', value: approvalData.pending },
    { name: 'Approved', value: approvalData.approved },
    { name: 'Rejected', value: approvalData.rejected },
  ].filter(d => d.value > 0);

  const approvalColors = ['hsl(var(--chart-4))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Department Distribution */}
      <Card className="border-border/40 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-chart-1 to-chart-4" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-chart-4/10 rounded-lg">
              <Users className="h-4 w-4 text-chart-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Staff by Department</CardTitle>
              <p className="text-[10px] text-muted-foreground">Active employee distribution</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly Approvals */}
      <Card className="border-border/40 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-success via-chart-4 to-destructive" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-chart-3/10 rounded-lg">
              <Users className="h-4 w-4 text-chart-3" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Monthly Approvals</CardTitle>
              <p className="text-[10px] text-muted-foreground">Request status breakdown</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {approvalChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={approvalChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {approvalChartData.map((_, i) => <Cell key={i} fill={approvalColors[i]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No approval data this month</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentActivityChart;
