import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawalControl {
  disabled: boolean;
  disabled_until: string | null;
  disabled_reason: string;
}

export const useWithdrawalControl = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["withdrawal-control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "withdrawal_control")
        .maybeSingle();

      if (error) throw error;
      if (!data) return { disabled: false, disabled_until: null, disabled_reason: "" } as WithdrawalControl;
      return data.setting_value as unknown as WithdrawalControl;
    },
  });

  const isWithdrawalDisabled = (): { disabled: boolean; reason: string; until: string | null } => {
    if (!data || !data.disabled) return { disabled: false, reason: "", until: null };
    
    // Check if disabled_until has passed
    if (data.disabled_until) {
      const untilDate = new Date(data.disabled_until);
      if (untilDate <= new Date()) {
        return { disabled: false, reason: "", until: null };
      }
    }
    
    return { disabled: true, reason: data.disabled_reason, until: data.disabled_until };
  };

  const updateControl = useMutation({
    mutationFn: async (control: WithdrawalControl) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ 
          setting_value: control as any, 
          updated_at: new Date().toISOString() 
        })
        .eq("setting_key", "withdrawal_control");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-control"] });
    },
  });

  return {
    control: data,
    loading: isLoading,
    isWithdrawalDisabled,
    updateControl,
  };
};
