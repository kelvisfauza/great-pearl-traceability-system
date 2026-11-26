// Admin switches and limits for automatic actions, saved in system_settings.automation_controls.
// Missing values use the original defaults; a failed read turns money automation OFF so a person decides.
export interface AutomationControls {
  mealAuto: boolean; withdrawalAuto: boolean; outlookOoo: boolean;
  withdrawalLimit: number; workDays: number; maxPerDay: number; sourceDays: number;
  mealLimit: number; mealUsualMultiplier: number;
}
export const AUTOMATION_DEFAULTS = { withdrawalLimit: 30000, workDays: 3, maxPerDay: 1, sourceDays: 7, mealLimit: 50000, mealUsualMultiplier: 1.5 };
// Hard bounds so a typo cannot open large automatic payouts.
export const AUTOMATION_BOUNDS = { withdrawalLimit: [1000, 500000], workDays: [1, 30], maxPerDay: [1, 5], sourceDays: [1, 60], mealLimit: [1000, 500000], mealUsualMultiplier: [1, 5] } as const;
const num = (v: unknown, k: keyof typeof AUTOMATION_BOUNDS) => {
  const n = Number(v); const [lo, hi] = AUTOMATION_BOUNDS[k];
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : AUTOMATION_DEFAULTS[k];
};
export function parseAutomationControls(v: Record<string, unknown>): AutomationControls {
  return {
    mealAuto: v.meal_auto !== false, withdrawalAuto: v.withdrawal_auto !== false, outlookOoo: v.outlook_ooo !== false,
    withdrawalLimit: num(v.withdrawal_limit, 'withdrawalLimit'), workDays: num(v.work_days, 'workDays'),
    maxPerDay: Math.floor(num(v.max_per_day, 'maxPerDay')), sourceDays: Math.floor(num(v.source_days, 'sourceDays')),
    mealLimit: num(v.meal_limit, 'mealLimit'), mealUsualMultiplier: num(v.meal_usual_multiplier, 'mealUsualMultiplier'),
  };
}
export async function readAutomationControls(db: any): Promise<AutomationControls> {
  const { data, error } = await db.from("system_settings").select("setting_value").eq("setting_key", "automation_controls").maybeSingle();
  if (error) return { ...parseAutomationControls({}), mealAuto: false, withdrawalAuto: false, outlookOoo: false };
  return parseAutomationControls((data?.setting_value || {}) as Record<string, unknown>);
}
