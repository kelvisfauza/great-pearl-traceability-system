import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WithdrawalLimits {
  per_transaction: number | null;
  daily: number | null;
}

export const useWithdrawalLimits = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["withdrawal-limits"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("system_settings" as any)
        .select("setting_value")
        .eq("setting_key", "withdrawal_limits")
        .maybeSingle() as any);
      if (error) throw error;
      if (!data) return { per_transaction: null, daily: null } as WithdrawalLimits;
      return (data.setting_value || { per_transaction: null, daily: null }) as WithdrawalLimits;
    },
  });

  const updateLimits = useMutation({
    mutationFn: async (limits: WithdrawalLimits) => {
      const { error } = await (supabase
        .from("system_settings" as any) as any)
        .upsert(
          {
            setting_key: "withdrawal_limits",
            setting_value: limits as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-limits"] });
    },
  });

  /**
   * Validate a proposed withdrawal amount against the configured limits.
   * Returns { ok: true } if allowed, otherwise { ok: false, reason }.
   */
  const validateAmount = async (
    userId: string | null | undefined,
    amount: number,
  ): Promise<{ ok: boolean; reason?: string }> => {
    const limits = data || { per_transaction: null, daily: null };

    if (limits.per_transaction && amount > limits.per_transaction) {
      return {
        ok: false,
        reason: `Per-transaction limit is UGX ${limits.per_transaction.toLocaleString()}. Please reduce the amount.`,
      };
    }

    if (limits.daily && userId) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data: rows } = await supabase
        .from("withdrawal_requests")
        .select("amount, status")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .not("status", "in", "(rejected,failed,cancelled,expired)");
      const usedToday = (rows || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const remaining = limits.daily - usedToday;
      if (amount > remaining) {
        return {
          ok: false,
          reason: `Daily limit is UGX ${limits.daily.toLocaleString()}. You've used UGX ${usedToday.toLocaleString()} today (remaining: UGX ${Math.max(0, remaining).toLocaleString()}).`,
        };
      }
    }

    return { ok: true };
  };

  return {
    limits: data,
    loading: isLoading,
    updateLimits,
    validateAmount,
  };
};