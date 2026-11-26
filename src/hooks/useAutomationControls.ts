import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AutomationKey = "meal_auto" | "withdrawal_auto" | "outlook_ooo";
export type AutomationNumberKey = "withdrawal_limit" | "work_days" | "max_per_day" | "source_days" | "meal_limit" | "meal_usual_multiplier";
export type AutomationControls = Record<AutomationKey, boolean> & Record<AutomationNumberKey, number> & { changed_by?: string; changed_at?: string };

/** Defaults and bounds match the server (supabase/functions/_shared/automation-controls.ts). */
export const AUTOMATION_DEFAULTS: Record<AutomationNumberKey, number> = { withdrawal_limit: 30000, work_days: 3, max_per_day: 1, source_days: 7, meal_limit: 50000, meal_usual_multiplier: 1.5 };
export const AUTOMATION_BOUNDS: Record<AutomationNumberKey, [number, number]> = { withdrawal_limit: [1000, 500000], work_days: [1, 30], max_per_day: [1, 5], source_days: [1, 60], meal_limit: [1000, 500000], meal_usual_multiplier: [1, 5] };

const parse = (v: Record<string, any>): AutomationControls => {
  const out: any = { meal_auto: v.meal_auto !== false, withdrawal_auto: v.withdrawal_auto !== false, outlook_ooo: v.outlook_ooo !== false, changed_by: v.changed_by, changed_at: v.changed_at };
  (Object.keys(AUTOMATION_DEFAULTS) as AutomationNumberKey[]).forEach(k => {
    const n = Number(v[k]); const [lo, hi] = AUTOMATION_BOUNDS[k];
    out[k] = Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : AUTOMATION_DEFAULTS[k];
  });
  return out;
};

export const useAutomationControls = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["automation-controls"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("system_settings" as any) as any).select("setting_value").eq("setting_key", "automation_controls").maybeSingle();
      if (error) throw error;
      return parse((data?.setting_value || {}) as Record<string, any>);
    },
  });
  const save = useMutation({
    mutationFn: async (patch: Partial<AutomationControls>) => {
      const cur = query.data;
      if (!cur) throw new Error("Settings not loaded");
      const { data: u } = await supabase.auth.getUser();
      const { changed_by: _a, changed_at: _b, ...base } = cur;
      const next = { ...base, ...patch, changed_by: u.user?.email || "admin", changed_at: new Date().toISOString() };
      const { error } = await (supabase.from("system_settings" as any) as any).upsert({ setting_key: "automation_controls", setting_value: next, updated_at: new Date().toISOString(), updated_by: u.user?.id }, { onConflict: "setting_key" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-controls"] }),
  });
  return { ...query, save };
};
