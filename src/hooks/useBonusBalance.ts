import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useBonusBalance = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bonus-balance", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      // Get all bonuses for this employee
      const { data: bonuses, error } = await supabase
        .from("bonuses")
        .select("*")
        .eq("employee_email", user!.email!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const pending = (bonuses || []).filter((b: any) => b.status === "pending");
      const claimed = (bonuses || []).filter((b: any) => b.status === "claimed");
      const totalPending = pending.reduce((s: number, b: any) => s + Number(b.amount), 0);
      const totalClaimed = claimed.reduce((s: number, b: any) => s + Number(b.amount), 0);

      return {
        pendingBonuses: pending,
        claimedBonuses: claimed,
        totalPending,
        totalClaimed,
        totalAll: totalPending + totalClaimed,
      };
    },
  });

  return {
    bonusData: data,
    loading: isLoading,
    refetch,
  };
};
