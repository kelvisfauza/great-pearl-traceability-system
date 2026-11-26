// Admin on/off switches for automatic actions, saved in system_settings.automation_controls.
// Missing keys default ON (current behaviour); a failed read turns money automation OFF so a person decides.
export interface AutomationControls { mealAuto: boolean; withdrawalAuto: boolean; outlookOoo: boolean }
export async function readAutomationControls(db: any): Promise<AutomationControls> {
  const { data, error } = await db.from("system_settings").select("setting_value").eq("setting_key", "automation_controls").maybeSingle();
  if (error) return { mealAuto: false, withdrawalAuto: false, outlookOoo: false };
  const v = (data?.setting_value || {}) as Record<string, unknown>;
  return { mealAuto: v.meal_auto !== false, withdrawalAuto: v.withdrawal_auto !== false, outlookOoo: v.outlook_ooo !== false };
}
