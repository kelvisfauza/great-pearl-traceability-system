import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Truck, MapPin, Route, Package } from "lucide-react";

const LogisticsWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["logistics-work-summary"],
    queryFn: async () => {
      const [routes, totalStock] = await Promise.all([
        supabase.from("delivery_routes").select("*", { count: "exact", head: true }),
        supabase.from("coffee_records").select("kilograms").not("status", "in", '("sold_out","rejected","QUALITY_REJECTED")').gt("kilograms", 0),
      ]);

      const stock = totalStock.data?.reduce((s, r) => s + (r.kilograms || 0), 0) || 0;

      return {
        activeRoutes: routes.count || 0,
        totalStock: Math.round(stock).toLocaleString(),
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Delivery Routes", value: data?.activeRoutes ?? 0, icon: Route, color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { label: "Stock to Move (kg)", value: data?.totalStock ?? "0", icon: Package, color: "text-green-600", bgColor: "bg-green-500/10", link: "/v2/inventory" },
  ];

  return <WorkSummaryCard title="Logistics" icon={Truck} color="text-indigo-600" items={items} />;
};

export default LogisticsWorkSummary;
