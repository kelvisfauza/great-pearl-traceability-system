import { supabase } from "@/integrations/supabase/client";

export type TeamsChannel = "hr" | "quality" | "trade";

/**
 * Fire-and-forget post to a Microsoft Teams channel via the `teams-notify` edge function.
 * Never throws — failures are logged so they don't break user flows.
 */
export function notifyTeams(channel: TeamsChannel, title: string, message: string) {
  try {
    supabase.functions
      .invoke("teams-notify", { body: { channel, title, message } })
      .catch((e) => console.error(`teams-notify (${channel}) failed`, e));
  } catch (e) {
    console.error(`teams-notify (${channel}) threw`, e);
  }
}