import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { FlaskConical, Clock, Droplets, Weight, Warehouse, CheckCircle2, TrendingUp } from "lucide-react";

const QualityWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["quality-work-summary"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [
        pendingAssessments,
        todayAssessments,
        yesterdayAssessments,
        avgMoisture,
        totalStock,
      ] = await Promise.all([
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("quality_assessments").select("*", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
        supabase.from("quality_assessments").select("*", { count: "exact", head: true }).gte("created_at", `${yesterdayStr}T00:00:00`).lt("created_at", `${today}T00:00:00`),
        supabase.from("quality_assessments").select("moisture").gte("created_at", `${today}T00:00:00`),
        supabase.from("coffee_records").select("kilograms").not("status", "in", '("sold_out","rejected")').gt("kilograms", 0),
      ]);

      const moistureData = avgMoisture.data || [];
      const avgMC = moistureData.length > 0 
        ? (moistureData.reduce((s, r) => s + (r.moisture || 0), 0) / moistureData.length).toFixed(1) 
        : "N/A";

      const stock = totalStock.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;

      return {
        pending: pendingAssessments.count || 0,
        todayDone: todayAssessments.count || 0,
        yesterdayDone: yesterdayAssessments.count || 0,
        avgMC,
        totalStock: Math.round(stock).toLocaleString(),
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Pending Assessments", value: data?.pending ?? 0, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", link: "/v2/quality", urgent: true },
    { label: "Completed Today", value: data?.todayDone ?? 0, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-500/10" },
    { label: "Yesterday's Assessments", value: data?.yesterdayDone ?? 0, icon: TrendingUp, color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { label: "Avg MC Today (%)", value: data?.avgMC ?? "N/A", icon: Droplets, color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
    { label: "Total Stock (kg)", value: data?.totalStock ?? "0", icon: Warehouse, color: "text-emerald-600", bgColor: "bg-emerald-500/10", link: "/v2/inventory" },
  ];

  return <WorkSummaryCard title="Quality Control" icon={FlaskConical} color="text-purple-600" items={items} />;
};

export default QualityWorkSummary;
