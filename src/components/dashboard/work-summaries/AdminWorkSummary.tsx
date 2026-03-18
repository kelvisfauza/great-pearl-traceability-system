import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Shield, Clock, FileCheck, CreditCard, BookOpen, AlertTriangle, Edit, Trash2 } from "lucide-react";

const AdminWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["admin-work-summary"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const [
        pendingApprovals,
        pendingEditRequests,
        pendingDeletions,
        pendingPricing,
        activeBookings,
        yesterdayPurchases,
        pendingLoans,
      ] = await Promise.all([
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("edit_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("deletion_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).eq("status", "AWAITING_PRICING"),
        supabase.from("coffee_bookings").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("coffee_records").select("*", { count: "exact", head: true }).gte("date", yesterdayStr).lte("date", yesterdayStr),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("type", "quick_loan").eq("status", "pending"),
      ]);

      return {
        pendingApprovals: pendingApprovals.count || 0,
        pendingEdits: pendingEditRequests.count || 0,
        pendingDeletions: pendingDeletions.count || 0,
        pendingPricing: pendingPricing.count || 0,
        activeBookings: activeBookings.count || 0,
        yesterdayPurchases: yesterdayPurchases.count || 0,
        pendingLoans: pendingLoans.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Pending Approvals", value: data?.pendingApprovals ?? 0, icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10", link: "/approvals", urgent: true },
    { label: "Edit Requests", value: data?.pendingEdits ?? 0, icon: Edit, color: "text-blue-600", bgColor: "bg-blue-500/10", link: "/approvals", urgent: true },
    { label: "Deletion Requests", value: data?.pendingDeletions ?? 0, icon: Trash2, color: "text-red-600", bgColor: "bg-red-500/10", link: "/approvals", urgent: true },
    { label: "Awaiting Pricing", value: data?.pendingPricing ?? 0, icon: FileCheck, color: "text-purple-600", bgColor: "bg-purple-500/10", link: "/approvals", urgent: true },
    { label: "Active Bookings", value: data?.activeBookings ?? 0, icon: BookOpen, color: "text-green-600", bgColor: "bg-green-500/10", link: "/coffee-bookings" },
    { label: "Yesterday's Purchases", value: data?.yesterdayPurchases ?? 0, icon: CreditCard, color: "text-indigo-600", bgColor: "bg-indigo-500/10", link: "/store" },
    { label: "Pending Loan Requests", value: data?.pendingLoans ?? 0, icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-500/10", link: "/approvals", urgent: true },
  ];

  return <WorkSummaryCard title="Administration" icon={Shield} color="text-primary" items={items} />;
};

export default AdminWorkSummary;
