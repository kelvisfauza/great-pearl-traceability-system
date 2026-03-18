import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Award, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const PerformanceTab = () => {
  const { data: assessments, isLoading: aLoading } = useQuery({
    queryKey: ['perf-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_assessments').select('assessed_by, status, created_at');
      if (error) throw error;
      return data;
    }
  });

  const { data: reevals, isLoading: rLoading } = useQuery({
    queryKey: ['perf-reevals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_reevaluations').select('evaluated_by, created_at');
      if (error) throw error;
      return data;
    }
  });

  const { data: checklists, isLoading: cLoading } = useQuery({
    queryKey: ['perf-checklists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quality_daily_checklists').select('employee_email, employee_name, completion_percentage, checklist_date');
      if (error) throw error;
      return data;
    }
  });

  const { data: simulations } = useQuery({
    queryKey: ['perf-simulations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('training_simulations').select('trainee_email, trainee_name, score, is_correct');
      if (error) throw error;
      return data;
    }
  });

  const isLoading = aLoading || rLoading || cLoading;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Compute per-user stats
  const usersMap: Record<string, any> = {};
  
  assessments?.forEach(a => {
    if (!a.assessed_by) return;
    if (!usersMap[a.assessed_by]) usersMap[a.assessed_by] = { email: a.assessed_by, assessments: 0, reevals: 0, avgChecklist: 0, checklistDays: 0, totalChecklist: 0, simScore: 0, simCount: 0 };
    usersMap[a.assessed_by].assessments++;
  });

  reevals?.forEach(r => {
    if (!r.evaluated_by) return;
    if (!usersMap[r.evaluated_by]) usersMap[r.evaluated_by] = { email: r.evaluated_by, assessments: 0, reevals: 0, avgChecklist: 0, checklistDays: 0, totalChecklist: 0, simScore: 0, simCount: 0 };
    usersMap[r.evaluated_by].reevals++;
  });

  checklists?.forEach(c => {
    const email = c.employee_email;
    if (!usersMap[email]) usersMap[email] = { email, name: c.employee_name, assessments: 0, reevals: 0, avgChecklist: 0, checklistDays: 0, totalChecklist: 0, simScore: 0, simCount: 0 };
    usersMap[email].name = c.employee_name;
    usersMap[email].checklistDays++;
    usersMap[email].totalChecklist += (c.completion_percentage || 0);
  });

  simulations?.forEach(s => {
    const email = s.trainee_email;
    if (!usersMap[email]) usersMap[email] = { email, name: s.trainee_name, assessments: 0, reevals: 0, avgChecklist: 0, checklistDays: 0, totalChecklist: 0, simScore: 0, simCount: 0 };
    usersMap[email].name = s.trainee_name;
    usersMap[email].simCount++;
    usersMap[email].simScore += (s.score || 0);
  });

  const rankings = Object.values(usersMap).map((u: any) => {
    const avgChecklist = u.checklistDays ? u.totalChecklist / u.checklistDays : 0;
    const avgSimScore = u.simCount ? u.simScore / u.simCount : 0;
    const overallScore = (u.assessments * 2) + (u.reevals * 3) + avgChecklist + avgSimScore;
    return { ...u, avgChecklist: parseFloat(avgChecklist.toFixed(0)), avgSimScore: parseFloat(avgSimScore.toFixed(0)), overallScore: parseFloat(overallScore.toFixed(0)) };
  }).sort((a, b) => b.overallScore - a.overallScore);

  const chartData = rankings.slice(0, 8).map(r => ({
    name: (r.name || r.email).split('@')[0].slice(0, 12),
    assessments: r.assessments,
    reevals: r.reevals,
    checklist: r.avgChecklist,
  }));

  return (
    <div className="space-y-4 mt-4">
      {/* Top Performer */}
      {rankings.length > 0 && (
        <Card className="border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100"><Trophy className="h-6 w-6 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Top Quality Officer</p>
              <p className="text-xl font-bold">{rankings[0].name || rankings[0].email}</p>
              <p className="text-sm text-muted-foreground">Score: {rankings[0].overallScore} | {rankings[0].assessments} assessments</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Performance Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="assessments" fill="hsl(var(--primary))" name="Assessments" />
                  <Bar dataKey="reevals" fill="hsl(142 76% 36%)" name="Re-evaluations" />
                  <Bar dataKey="checklist" fill="hsl(38 92% 50%)" name="Avg Checklist %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Quality Officer Rankings</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Assessments</TableHead>
                  <TableHead>Re-evals</TableHead>
                  <TableHead>Avg Checklist</TableHead>
                  <TableHead>Sim Score</TableHead>
                  <TableHead>Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((r, i) => (
                  <TableRow key={r.email}>
                    <TableCell>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.name || r.email}</TableCell>
                    <TableCell>{r.assessments}</TableCell>
                    <TableCell>{r.reevals}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={r.avgChecklist} className="w-16 h-2" />
                        <span className="text-sm">{r.avgChecklist}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.avgSimScore}%</TableCell>
                    <TableCell><Badge variant="outline" className="font-bold">{r.overallScore}</Badge></TableCell>
                  </TableRow>
                ))}
                {rankings.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No performance data yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceTab;
