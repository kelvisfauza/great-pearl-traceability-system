import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveLeave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
}

export const useActiveLeave = () => {
  const { employee } = useAuth();

  const { data: activeLeave, isLoading } = useQuery({
    queryKey: ["active-leave", employee?.email],
    queryFn: async () => {
      if (!employee?.email) return null;

      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("approval_requests")
        .select("id, details, status")
        .eq("type", "leave")
        .eq("status", "approved")
        .eq("requestedby", employee.email);

      if (error) throw error;

      // Find leave where today falls within the date range
      const active = data?.find((req) => {
        const details = req.details as any;
        if (!details?.start_date || !details?.end_date) return false;
        return today >= details.start_date && today <= details.end_date;
      });

      if (!active) return null;

      const details = active.details as any;
      return {
        id: active.id,
        leave_type: details.leave_type,
        start_date: details.start_date,
        end_date: details.end_date,
        days: details.days,
      } as ActiveLeave;
    },
    enabled: !!employee?.email,
    refetchInterval: 60000, // Re-check every minute
  });

  return { activeLeave: activeLeave ?? null, isLoading };
};
