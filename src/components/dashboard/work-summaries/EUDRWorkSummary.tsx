import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Leaf, Clock, MapPin, FileCheck, AlertTriangle } from "lucide-react";

const EUDRWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["eudr-work-summary"],
    queryFn: async () => {
      const [pendingDocs, totalFarmers, recentDispatches] = await Promise.all([
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).not("status", "in", '("sold_out","rejected","QUALITY_REJECTED")'),
      ]);

      return {
        pendingDocs: pendingDocs.count || 0,
        totalFarmers: totalFarmers.count || 0,
        activeLots: recentDispatches.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Pending Documentation", value: data?.pendingDocs ?? 0, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", link: "/eudr-documentation", urgent: true },
    { label: "Registered Farmers", value: data?.totalFarmers ?? 0, icon: MapPin, color: "text-green-600", bgColor: "bg-green-500/10", link: "/suppliers" },
    { label: "Active Lots", value: data?.activeLots ?? 0, icon: FileCheck, color: "text-blue-600", bgColor: "bg-blue-500/10" },
  ];

  return <WorkSummaryCard title="EUDR Compliance" icon={Leaf} color="text-green-600" items={items} />;
};

export default EUDRWorkSummary;
