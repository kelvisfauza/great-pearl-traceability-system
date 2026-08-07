import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityRole } from "@/hooks/useQualityRole";
import {
  FlaskConical, ShieldCheck, RefreshCw, Paperclip, FileSignature, Warehouse,
  CheckSquare, BarChart3, History, FileText, Loader2, ArrowRight, Star,
  Edit3, Zap, GraduationCap, Lightbulb, BookOpen, Settings2, Trophy, Calculator
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

interface Props {
  onNavigate: (tabId: string) => void;
  /** Map the generic section keys to the host page's tab ids (V1 uses different ids) */
  tabIds?: Partial<Record<
    | "assessments" | "approvals" | "reevaluation" | "files" | "analysisForm" | "warehouse" | "checklist" | "history" | "analytics" | "performance"
    | "modifications" | "priceCalculator" | "quickAnalyses" | "training" | "recommendations" | "defects" | "reports" | "adminPricing",
    string
  >>;
}

const today = new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const Stars = ({ score }: { score: number }) => {
  const full = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <span className="inline-flex items-center gap-0.5" title={`${score.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          style={{
            color: `hsl(var(--chart-4))`,
            fill: i < full ? `hsl(var(--chart-4))` : "transparent",
          }}
        />
      ))}
    </span>
  );
};

const QualityOverviewTab = ({ onNavigate, tabIds }: Props) => {
  const { employee } = useAuth();
  const { isQualityHead } = useQualityRole();

  const T = {
    assessments: "assessments",
    approvals: "approvals",
    reevaluation: "reevaluation",
    files: "files",
    analysisForm: "analysis-form",
    warehouse: "warehouse",
    checklist: "checklist",
    history: "history",
    analytics: "analytics",
    performance: "performance",
    modifications: "modifications",
    priceCalculator: "price-calculator",
    quickAnalyses: "quick-analyses",
    training: "training",
    recommendations: "recommendations",
    defects: "defects",
    reports: "reports",
    adminPricing: "admin-pricing",
    ...(tabIds || {}),
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ["quality-overview-stats", today],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [lots, approvals, reevals, files, todayAssessments] = await Promise.all([
        supabase.from("coffee_records").select("id,status").limit(1000),
        supabase
          .from("quality_assessments")
          .select("id")
          .in("status", ["pending_quality_manager", "assessed"])
          .is("qm_action", null),
        (supabase as any).from("quality_reevaluations").select("id,status"),
        (supabase as any).from("quality_analysis_files").select("id"),
        supabase.from("quality_assessments").select("id").eq("date_assessed", today),
      ]);

      const lotRows = (lots.data as any[]) || [];
      const reevalRows = (reevals as any)?.data || [];

      return {
        pendingLots: lotRows.filter((l) => l.status === "pending").length,
        rejectedLots: lotRows.filter((l) => l.status === "QUALITY_REJECTED").length,
        pendingApprovals: ((approvals.data as any[]) || []).length,
        pendingReevals: reevalRows.filter((r: any) => (r.status || "pending") === "pending").length,
        analysisFiles: ((files as any)?.data || []).length,
        assessedToday: ((todayAssessments.data as any[]) || []).length,
      };
    },
  });

  // ---- Analysis analytics (last 30 days) ----
  const { data: analysis } = useQuery({
    queryKey: ["quality-overview-analysis", today],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("quality_assessments")
        .select("id,date_assessed,moisture,group1_defects,group2_defects,below12,pods,husks,stones,fm,outturn,final_price,suggested_price,status,qm_action,assessed_by,physical_assessment_by,batch_number")
        .gte("date_assessed", daysAgo(29))
        .order("date_assessed", { ascending: true })
        .limit(2000);

      const rows = (data as any[]) || [];

      // Trend for last 14 days
      const trend = Array.from({ length: 14 }, (_, i) => {
        const d = daysAgo(13 - i);
        const dayRows = rows.filter((r) => r.date_assessed === d);
        const avg = (k: string) =>
          dayRows.length
            ? dayRows.reduce((s, r) => s + (Number(r[k]) || 0), 0) / dayRows.length
            : 0;
        return {
          day: d.slice(5),
          assessments: dayRows.length,
          moisture: Number(avg("moisture").toFixed(2)),
          outturn: Number(avg("outturn").toFixed(2)),
        };
      });

      const avgOf = (k: string) => {
        const v = rows.map((r) => Number(r[k])).filter((n) => !isNaN(n) && n !== null);
        return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
      };

      const params = [
        { name: "Moisture", value: Number(avgOf("moisture").toFixed(2)), max: 14 },
        { name: "Grp1 Def", value: Number(avgOf("group1_defects").toFixed(2)), max: 5 },
        { name: "Grp2 Def", value: Number(avgOf("group2_defects").toFixed(2)), max: 10 },
        { name: "Below 12", value: Number(avgOf("below12").toFixed(2)), max: 10 },
        { name: "FM", value: Number(avgOf("fm").toFixed(2)), max: 3 },
        { name: "Outturn", value: Number(avgOf("outturn").toFixed(2)), max: 100 },
      ];

      const defectMix = [
        { name: "Pods", value: Number(avgOf("pods").toFixed(2)) },
        { name: "Husks", value: Number(avgOf("husks").toFixed(2)) },
        { name: "Stones", value: Number(avgOf("stones").toFixed(2)) },
        { name: "Grp1", value: Number(avgOf("group1_defects").toFixed(2)) },
        { name: "Grp2", value: Number(avgOf("group2_defects").toFixed(2)) },
      ].filter((d) => d.value > 0);

      // Per-assessor performance
      const byPerson = new Map<string, any>();
      rows.forEach((r) => {
        const name = (r.physical_assessment_by || r.assessed_by || "Unassigned").trim();
        const cur = byPerson.get(name) || { name, total: 0, approved: 0, rejected: 0, moisture: 0, mCount: 0 };
        cur.total += 1;
        if (r.qm_action === "approved") cur.approved += 1;
        if (r.qm_action === "rejected" || r.status === "QUALITY_REJECTED") cur.rejected += 1;
        if (r.moisture != null) { cur.moisture += Number(r.moisture) || 0; cur.mCount += 1; }
        byPerson.set(name, cur);
      });

      const performance = Array.from(byPerson.values())
        .map((p) => {
          const reviewed = p.approved + p.rejected;
          const accuracy = reviewed ? (p.approved / reviewed) * 100 : 100;
          const volumeScore = Math.min(1, p.total / 20) * 2; // up to 2 stars for volume
          const rating = Math.min(5, (accuracy / 100) * 3 + volumeScore);
          return {
            ...p,
            avgMoisture: p.mCount ? p.moisture / p.mCount : 0,
            accuracy,
            rating,
          };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      const reviewed = rows.filter((r) => r.qm_action);
      const approvalRate = reviewed.length
        ? (reviewed.filter((r) => r.qm_action === "approved").length / reviewed.length) * 100
        : 0;

      return {
        trend,
        params,
        defectMix,
        performance,
        total30: rows.length,
        approvalRate,
        avgMoisture: avgOf("moisture"),
        avgOutturn: avgOf("outturn"),
      };
    },
  });

  const { data: checklist } = useQuery({
    queryKey: ["quality-overview-checklist", today, employee?.email],
    enabled: !!employee?.email,
    queryFn: async () => {
      const { data } = await supabase
        .from("quality_daily_checklists")
        .select("*")
        .eq("employee_email", employee?.email || "")
        .eq("checklist_date", today)
        .maybeSingle();
      return data as any;
    },
  });

  const checklistItems = [
    { key: "moisture_meter_calibrated", label: "Calibrate moisture meter" },
    { key: "scales_calibrated", label: "Calibrate scales" },
    { key: "workspace_cleaned", label: "Clean workspace" },
    { key: "samples_labeled", label: "Label all samples" },
    { key: "equipment_checked", label: "Check equipment" },
  ].filter((i) => checklist === null || checklist === undefined || i.key in (checklist || {}));

  const doneCount = checklistItems.filter((i) => checklist?.[i.key]).length;
  const checklistPct = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;

  const cards = [
    {
      id: T.assessments,
      title: "Pending Assessments",
      value: stats?.pendingLots ?? 0,
      hint: "Lots waiting for quality assessment",
      icon: FlaskConical,
      chart: 4,
    },
    {
      id: T.approvals,
      title: "Awaiting Approval",
      value: stats?.pendingApprovals ?? 0,
      hint: "Assessments for the Quality Manager",
      icon: ShieldCheck,
      chart: 1,
      headOnly: true,
    },
    {
      id: T.modifications,
      title: "Modifications",
      value: "—",
      hint: "Rejected payments sent for quality rework",
      icon: Edit3,
      chart: 11,
    },
    {
      id: T.reevaluation,
      title: "Re-evaluations",
      value: stats?.pendingReevals ?? 0,
      hint: "Open re-evaluation requests",
      icon: RefreshCw,
      chart: 3,
    },
    {
      id: T.assessments,
      title: "Assessed Today",
      value: stats?.assessedToday ?? 0,
      hint: "Assessments captured today",
      icon: CheckSquare,
      chart: 2,
    },
    {
      id: T.files,
      title: "Analysis Files",
      value: stats?.analysisFiles ?? 0,
      hint: "Stamped analysis sheets on file",
      icon: Paperclip,
      chart: 5,
    },
    {
      id: T.analysisForm,
      title: "Quality Analysis Form",
      value: "—",
      hint: "Fill & print an analysis sheet",
      icon: FileSignature,
      chart: 6,
    },
    {
      id: T.priceCalculator,
      title: "Price Calculator",
      value: "—",
      hint: "Run quality price calculations",
      icon: Calculator,
      chart: 12,
    },
    {
      id: T.quickAnalyses,
      title: "Quick Analyses",
      value: "—",
      hint: "Rapid assessment lookup",
      icon: Zap,
      chart: 13,
    },
    {
      id: T.warehouse,
      title: "Warehouse",
      value: "—",
      hint: "Storage monitoring",
      icon: Warehouse,
      chart: 7,
    },
    {
      id: T.checklist,
      title: "Daily Checklist",
      value: `${doneCount}/${checklistItems.length}`,
      hint: "Today's routine",
      icon: CheckSquare,
      chart: 8,
    },
    {
      id: T.history,
      title: "History",
      value: "—",
      hint: "Past assessments",
      icon: History,
      chart: 9,
      headOnly: true,
    },
    {
      id: T.analytics,
      title: "Analytics",
      value: "—",
      hint: "Supplier quality trends",
      icon: BarChart3,
      chart: 10,
      headOnly: true,
    },
    {
      id: T.reports,
      title: "Reports",
      value: "—",
      hint: "Quality reports & exports",
      icon: FileText,
      chart: 14,
      headOnly: true,
    },
    {
      id: T.recommendations,
      title: "Recommendations",
      value: "—",
      hint: "Quality improvement suggestions",
      icon: Lightbulb,
      chart: 15,
      headOnly: true,
    },
    {
      id: T.training,
      title: "Training",
      value: "—",
      hint: "Quality training materials",
      icon: GraduationCap,
      chart: 16,
    },
    {
      id: T.defects,
      title: "Defect Library",
      value: "—",
      hint: "Reference defect standards",
      icon: BookOpen,
      chart: 17,
    },
    {
      id: T.adminPricing,
      title: "Admin Pricing Review",
      value: "—",
      hint: "Review & adjust final prices",
      icon: Settings2,
      chart: 18,
      headOnly: true,
    },
    {
      id: T.assessments,
      title: "Rejected Lots",
      value: stats?.rejectedLots ?? 0,
      hint: "Lots rejected on quality",
      icon: FileText,
      chart: 0,
    },
  ].filter((c) => !!c.id && (!c.headOnly || isQualityHead));

  const toneVar = (n: number) => (n === 0 ? "var(--destructive)" : `var(--chart-${(n - 1) % 5 + 1})`);

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--popover-foreground))",
    fontSize: 12,
  };

  const overallScore = analysis
    ? Math.max(
        0,
        Math.min(
          5,
          (analysis.approvalRate / 100) * 3 +
            (analysis.avgMoisture > 0 && analysis.avgMoisture <= 13.5 ? 1 : 0.4) +
            (analysis.avgOutturn >= 78 ? 1 : 0.5)
        )
      )
    : 0;

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      )}

      {/* Score strip */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Overall quality score</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{overallScore.toFixed(1)}</span>
              <Stars score={overallScore} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Assessments (30d)</p>
            <p className="text-2xl font-bold mt-1">{analysis?.total30 ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approval rate</p>
            <p className="text-2xl font-bold mt-1" style={{ color: "hsl(var(--chart-1))" }}>
              {(analysis?.approvalRate ?? 0).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg moisture / outturn</p>
            <p className="text-2xl font-bold mt-1">
              {(analysis?.avgMoisture ?? 0).toFixed(1)}% / {(analysis?.avgOutturn ?? 0).toFixed(1)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Coloured stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <button
              key={`${c.id}-${idx}`}
              onClick={() => onNavigate(c.id!)}
              className="text-left rounded-xl border p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
              style={{
                background: `linear-gradient(135deg, hsl(${toneVar(c.chart)} / 0.18), hsl(${toneVar(c.chart)} / 0.04))`,
                borderColor: `hsl(${toneVar(c.chart)} / 0.35)`,
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{c.title}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: `hsl(${toneVar(c.chart)})` }}>
                    {c.value}
                  </p>
                </div>
                <span
                  className="rounded-lg p-2"
                  style={{ background: `hsl(${toneVar(c.chart)} / 0.18)`, color: `hsl(${toneVar(c.chart)})` }}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                {c.hint} <ArrowRight className="h-3 w-3" />
              </p>
            </button>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Assessments & moisture trend (14 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis?.trend || []}>
                <defs>
                  <linearGradient id="qaA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="qaM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="assessments" stroke="hsl(var(--chart-1))" fill="url(#qaA)" name="Assessments" />
                <Area type="monotone" dataKey="moisture" stroke="hsl(var(--chart-3))" fill="url(#qaM)" name="Avg moisture %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Average analysis parameters (30 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis?.params || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Average" radius={[6, 6, 0, 0]}>
                  {(analysis?.params || []).map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Defect mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysis?.defectMix || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(analysis?.defectMix || []).map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Assessor performance (30 days)
              {T.performance && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => onNavigate(T.performance!)}>
                  Full report →
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {(analysis?.performance || []).length === 0 && (
              <p className="text-sm text-muted-foreground">No assessments in the last 30 days.</p>
            )}
            {(analysis?.performance || []).map((p: any) => (
              <div key={p.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[45%]">{p.name}</span>
                  <span className="flex items-center gap-2">
                    <Stars score={p.rating} />
                    <Badge variant="secondary">{p.total} lots</Badge>
                  </span>
                </div>
                <Progress value={p.accuracy} />
                <p className="text-xs text-muted-foreground">
                  {p.accuracy.toFixed(0)}% approved · avg moisture {p.avgMoisture.toFixed(1)}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Today's tasks
            <Badge variant="secondary">{doneCount}/{checklistItems.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={checklistPct} />
          <ul className="space-y-2 text-sm">
            {checklistItems.map((i) => (
              <li key={i.key} className="flex items-center gap-2">
                <CheckSquare
                  className="h-4 w-4"
                  style={{ color: checklist?.[i.key] ? "hsl(var(--chart-1))" : "hsl(var(--muted-foreground))" }}
                />
                <span className={checklist?.[i.key] ? "line-through text-muted-foreground" : ""}>{i.label}</span>
              </li>
            ))}
          </ul>
          {T.checklist && <button
            type="button"
            onClick={() => onNavigate(T.checklist!)}
            className="text-xs text-primary hover:underline"
          >
            Open daily checklist →
          </button>}
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityOverviewTab;
