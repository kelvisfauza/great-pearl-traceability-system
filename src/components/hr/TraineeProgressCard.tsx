import { useEffect, useState } from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TOUR_STEPS } from '@/components/trainee/curriculum';
import { isTraineeRole } from '@/lib/trainee';

interface Row {
  id: string;
  name: string;
  email: string;
  status: string | null;
  current_step: number;
  completed_steps: number[];
  started_at: string | null;
  completed_at: string | null;
}

/** HR / admin overview of every Trainee account and how far each is through the guided tour. */
export default function TraineeProgressCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: emps } = await supabase
        .from('employees')
        .select('id, name, email, role, status')
        .in('role', ['Trainee', 'trainee', 'Intern', 'Internee']);
      const trainees = (emps || []).filter((e) => isTraineeRole(e.role));
      const ids = trainees.map((e) => e.id);
      let progress: any[] = [];
      if (ids.length) {
        const { data } = await (supabase as any)
          .from('trainee_progress')
          .select('employee_id, current_step, completed_steps, started_at, completed_at')
          .in('employee_id', ids);
        progress = data || [];
      }
      setRows(
        trainees.map((e) => {
          const p = progress.find((x) => x.employee_id === e.id);
          return {
            id: e.id,
            name: e.name,
            email: e.email,
            status: e.status,
            current_step: p?.current_step ?? 0,
            completed_steps: p?.completed_steps ?? [],
            started_at: p?.started_at ?? null,
            completed_at: p?.completed_at ?? null,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = TOUR_STEPS.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" /> Trainee Progress
          </CardTitle>
          <CardDescription>
            Interns on view-only Trainee accounts and how far they are through the guided tour.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No trainee accounts yet. Create one with the form on the left and choose the role
            <span className="font-medium"> Trainee</span>.
          </p>
        )}
        {rows.map((r) => {
          const done = r.completed_at ? total : Math.min(r.completed_steps.length, total);
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={r.id} className="space-y-1.5 border-b border-border last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
                {r.completed_at ? (
                  <Badge>Completed</Badge>
                ) : r.started_at ? (
                  <Badge variant="secondary">Step {Math.min(r.current_step + 1, total)} of {total}</Badge>
                ) : (
                  <Badge variant="outline">Not started</Badge>
                )}
              </div>
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {pct}% of the tour
                {r.completed_at && ` · finished ${new Date(r.completed_at).toLocaleDateString()}`}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
