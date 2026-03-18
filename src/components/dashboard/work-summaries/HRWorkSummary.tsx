import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import WorkSummaryCard from "./WorkSummaryCard";
import { Users, Clock, UserCheck, AlertTriangle, Calendar } from "lucide-react";

const HRWorkSummary = () => {
  const { data } = useQuery({
    queryKey: ["hr-work-summary"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const [todayAttendance, absentToday, pendingLeave, totalEmployees] = await Promise.all([
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).eq("status", "present"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("date", today).eq("status", "absent"),
        supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("type", "leave").eq("status", "pending"),
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);

      return {
        presentToday: todayAttendance.count || 0,
        absentToday: absentToday.count || 0,
        pendingLeave: pendingLeave.count || 0,
        totalEmployees: totalEmployees.count || 0,
      };
    },
    refetchInterval: 60000,
  });

  const items = [
    { label: "Present Today", value: data?.presentToday ?? 0, icon: UserCheck, color: "text-green-600", bgColor: "bg-green-500/10", link: "/attendance" },
    { label: "Absent Today", value: data?.absentToday ?? 0, icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-500/10", link: "/attendance", urgent: true },
    { label: "Pending Leave", value: data?.pendingLeave ?? 0, icon: Calendar, color: "text-orange-600", bgColor: "bg-orange-500/10", link: "/approvals", urgent: true },
    { label: "Total Staff", value: data?.totalEmployees ?? 0, icon: Users, color: "text-blue-600", bgColor: "bg-blue-500/10" },
  ];

  return <WorkSummaryCard title="Human Resources" icon={Users} color="text-blue-600" items={items} />;
};

export default HRWorkSummary;
