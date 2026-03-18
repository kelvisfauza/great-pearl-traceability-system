import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { MapPin, FileText, Users, TrendingUp } from "lucide-react";

const FieldOpsWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["fieldops-work-summary"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [yesterdayReports, totalStations, totalSuppliers] = await Promise.all([
        supabase.from("daily_reports").select("total_kgs_mobilized").gte("report_date", yesterdayStr).lte("report_date", yesterdayStr),
        supabase.from("buying_stations").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
      ]);

      const mobilized = yesterdayReports.data?.reduce((s, r) => s + (r.total_kgs_mobilized || 0), 0) || 0;

      return {
        yesterdayReports: yesterdayReports.data?.length || 0,
        kgMobilized: Math.round(mobilized).toLocaleString(),
        activeStations: totalStations.count || 0,
        totalSuppliers: totalSuppliers.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Yesterday's Reports", value: data?.yesterdayReports ?? 0, icon: FileText, color: "text-blue-600", bgColor: "bg-blue-500/10", link: "/field-operations" },
    { label: "KGs Mobilized", value: data?.kgMobilized ?? "0", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-500/10" },
    { label: "Active Stations", value: data?.activeStations ?? 0, icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-500/10" },
    { label: "Total Suppliers", value: data?.totalSuppliers ?? 0, icon: Users, color: "text-indigo-600", bgColor: "bg-indigo-500/10", link: "/suppliers" },
  ];

  return <WorkSummaryCard title="Field Operations" icon={MapPin} color="text-orange-600" items={items} />;
};

export default FieldOpsWorkSummary;
