import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Package, Clock, Weight, TrendingUp, Truck, CheckCircle2 } from "lucide-react";

const StoreWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["store-work-summary"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [todayReceipts, yesterdayReceipts, pendingQuality, totalStock] = await Promise.all([
        supabase.from("coffee_records").select("kilograms").gte("date", today),
        supabase.from("coffee_records").select("kilograms").gte("date", yesterdayStr).lt("date", today),
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("coffee_records").select("kilograms").not("status", "in", '("sold_out","rejected","QUALITY_REJECTED")').gt("kilograms", 0),
      ]);

      const todayKg = todayReceipts.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const yesterdayKg = yesterdayReceipts.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;
      const stock = totalStock.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;

      return {
        todayKg: Math.round(todayKg).toLocaleString(),
        todayCount: todayReceipts.data?.length || 0,
        yesterdayKg: Math.round(yesterdayKg).toLocaleString(),
        pendingQuality: pendingQuality.count || 0,
        totalStock: Math.round(stock).toLocaleString(),
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Received Today (kg)", value: data?.todayKg ?? "0", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-500/10", link: "/v2/store" },
    { label: "Today's Receipts", value: data?.todayCount ?? 0, icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-500/10", link: "/v2/store" },
    { label: "Yesterday (kg)", value: data?.yesterdayKg ?? "0", icon: TrendingUp, color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
    { label: "Awaiting Quality", value: data?.pendingQuality ?? 0, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", urgent: true },
    { label: "Total Stock (kg)", value: data?.totalStock ?? "0", icon: Weight, color: "text-emerald-600", bgColor: "bg-emerald-500/10", link: "/v2/inventory" },
  ];

  return <WorkSummaryCard title="Store Operations" icon={Package} color="text-blue-600" items={items} />;
};

export default StoreWorkSummary;
