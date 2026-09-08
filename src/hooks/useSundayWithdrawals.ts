import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SETTING_KEY = "sunday_withdrawals";

export const isSundayInKampala = (date: Date = new Date()) => {
  const local = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  return local.getDay() === 0;
};

export const useSundayWithdrawals = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sunday-withdrawals"],
    queryFn: async () => {
      // Read via security-definer RPC so every employee can see the flag.
      // Fail OPEN (allowed) if the read fails for any reason.
      const { data, error } = await (supabase.rpc as any)("get_sunday_withdrawals_enabled");
      if (error) return { enabled: true };
      return { enabled: data !== false };
    },
  });


  const enabled = data?.enabled === true;

  const setEnabled = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await (supabase.from("system_settings" as any) as any).upsert(
        {
          setting_key: SETTING_KEY,
          setting_value: { enabled: next } as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sunday-withdrawals"] }),
  });

  // Blocked only when it is Sunday (Kampala) AND the toggle is off
  const blockedToday = !isLoading && !enabled && isSundayInKampala();

  return { enabled, loading: isLoading, setEnabled, blockedToday };
};
