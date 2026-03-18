import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { ShoppingCart, BookOpen, Truck, TrendingUp, AlertTriangle } from "lucide-react";

const ProcurementWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["procurement-work-summary"],
    queryFn: async () => {
      const [activeBookings, expiringBookings, activeContracts, totalSuppliers] = await Promise.all([
        supabase.from("coffee_bookings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("coffee_bookings").select("*", { count: "exact", head: true }).eq("status", "active").lte("expiry_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]),
        supabase.from("buyer_contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("suppliers").select("*", { count: "exact", head: true }),
      ]);

      return {
        activeBookings: activeBookings.count || 0,
        expiringBookings: expiringBookings.count || 0,
        activeContracts: activeContracts.count || 0,
        totalSuppliers: totalSuppliers.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Active Bookings", value: data?.activeBookings ?? 0, icon: BookOpen, color: "text-blue-600", bgColor: "bg-blue-500/10", link: "/coffee-bookings" },
    { label: "Expiring (7 days)", value: data?.expiringBookings ?? 0, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-500/10", link: "/coffee-bookings", urgent: true },
    { label: "Active Contracts", value: data?.activeContracts ?? 0, icon: Truck, color: "text-green-600", bgColor: "bg-green-500/10", link: "/v2/procurement" },
    { label: "Total Suppliers", value: data?.totalSuppliers ?? 0, icon: TrendingUp, color: "text-purple-600", bgColor: "bg-purple-500/10", link: "/suppliers" },
  ];

  return <WorkSummaryCard title="Procurement" icon={ShoppingCart} color="text-pink-600" items={items} />;
};

export default ProcurementWorkSummary;
