import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityRole } from "@/hooks/useQualityRole";
import {
  FlaskConical, ShieldCheck, RefreshCw, Paperclip, FileSignature, Warehouse,
  CheckSquare, BarChart3, History, FileText, Loader2, ArrowRight
} from "lucide-react";

interface Props {
  onNavigate: (tabId: string) => void;
}

const today = new Date().toISOString().split("T")[0];

const QualityOverviewTab = ({ onNavigate }: Props) => {
  const { employee } = useAuth();
  const { isQualityHead } = useQualityRole();

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
      id: "assessments",
      title: "Pending Assessments",
      value: stats?.pendingLots ?? 0,
      hint: "Lots waiting for quality assessment",
      icon: FlaskConical,
      tone: "text-amber-600",
    },
    {
      id: "approvals",
      title: "Awaiting Approval",
      value: stats?.pendingApprovals ?? 0,
      hint: "Assessments for the Quality Manager",
      icon: ShieldCheck,
      tone: "text-primary",
      headOnly: true,
    },
    {
      id: "reevaluation",
      title: "Re-evaluations",
      value: stats?.pendingReevals ?? 0,
      hint: "Open re-evaluation requests",
      icon: RefreshCw,
      tone: "text-blue-600",
    },
    {
      id: "assessments",
      title: "Assessed Today",
      value: stats?.assessedToday ?? 0,
      hint: "Assessments captured today",
      icon: CheckSquare,
      tone: "text-emerald-600",
    },
    {
      id: "files",
      title: "Analysis Files",
      value: stats?.analysisFiles ?? 0,
      hint: "Stamped analysis sheets on file",
      icon: Paperclip,
      tone: "text-violet-600",
    },
    {
      id: "assessments",
      title: "Rejected Lots",
      value: stats?.rejectedLots ?? 0,
      hint: "Lots rejected on quality",
      icon: FileText,
      tone: "text-destructive",
    },
  ].filter((c) => !c.headOnly || isQualityHead);

  const shortcuts = [
    { id: "analysis-form", label: "Quality Analysis Form", icon: FileSignature, hint: "Fill & print an analysis sheet" },
    { id: "files", label: "Analysis Files", icon: Paperclip, hint: "Upload stamped forms" },
    { id: "warehouse", label: "Warehouse", icon: Warehouse, hint: "Storage monitoring" },
    { id: "checklist", label: "Daily Checklist", icon: CheckSquare, hint: "Today's routine" },
    { id: "history", label: "History", icon: History, hint: "Past assessments", headOnly: true },
    { id: "analytics", label: "Analytics", icon: BarChart3, hint: "Supplier quality trends", headOnly: true },
  ].filter((s) => !s.headOnly || isQualityHead);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <button key={`${c.id}-${c.title}`} type="button" onClick={() => onNavigate(c.id)} className="text-left">
              <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/40">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                    <p className="text-3xl font-bold mt-1">{c.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
                  </div>
                  <c.icon className={`h-6 w-6 ${c.tone}`} />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick access</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onNavigate(s.id)}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.hint}</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

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
                  <CheckSquare className={`h-4 w-4 ${checklist?.[i.key] ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className={checklist?.[i.key] ? "line-through text-muted-foreground" : ""}>{i.label}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onNavigate("checklist")}
              className="text-xs text-primary hover:underline"
            >
              Open daily checklist →
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QualityOverviewTab;
