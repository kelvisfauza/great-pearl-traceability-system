import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AutomationKey = "meal_auto" | "withdrawal_auto" | "outlook_ooo";
export type AutomationControls = Record<AutomationKey, boolean> & { changed_by?: string; changed_at?: string };

/** Missing switches mean ON, matching the server defaults. */
export const useAutomationControls = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["automation-controls"],
    queryFn: async (): Promise<AutomationControls> => {
      const { data, error } = await (supabase.from("system_settings" as any) as any).select("setting_value").eq("setting_key", "automation_controls").maybeSingle();
      if (error) throw error;
      const v = (data?.setting_value || {}) as Record<string, any>;
      return { meal_auto: v.meal_auto !== false, withdrawal_auto: v.withdrawal_auto !== false, outlook_ooo: v.outlook_ooo !== false, changed_by: v.changed_by, changed_at: v.changed_at };
    },
  });
  const save = useMutation({
    mutationFn: async ({ key, on }: { key: AutomationKey; on: boolean }) => {
      const cur = query.data;
      if (!cur) throw new Error("Settings not loaded");
      const { data: u } = await supabase.auth.getUser();
      const next = { meal_auto: cur.meal_auto, withdrawal_auto: cur.withdrawal_auto, outlook_ooo: cur.outlook_ooo, [key]: on, changed_by: u.user?.email || "admin", changed_at: new Date().toISOString() };
      const { error } = await (supabase.from("system_settings" as any) as any).upsert({ setting_key: "automation_controls", setting_value: next, updated_at: new Date().toISOString(), updated_by: u.user?.id }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-controls"] }),
  });
  return { ...query, save };
};
