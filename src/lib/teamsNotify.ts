import { supabase } from "@/integrations/supabase/client";

export type TeamsChannel = "hr" | "quality" | "trade";

export interface TeamsAction {
  label: string;
  url: string;
}

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

/**
 * Rich Teams post that returns the posted messageId so callers can later
 * reply in the same thread (e.g. for approval outcomes).
 * Pass `replyToMessageId` to post as a reply instead of a new thread.
 */
export async function notifyTeamsRich(opts: {
  channel: TeamsChannel;
  title?: string;
  message?: string;
  actions?: TeamsAction[];
  replyToMessageId?: string;
}): Promise<{ ok: boolean; messageId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("teams-notify", {
      body: {
        channel: opts.channel,
        title: opts.title ?? "",
        message: opts.message ?? "",
        actions: opts.actions ?? [],
        replyToMessageId: opts.replyToMessageId ?? "",
      },
    });
    if (error) {
      console.error(`teams-notify (${opts.channel}) error`, error);
      return { ok: false };
    }
    return { ok: !!data?.ok, messageId: data?.messageId };
  } catch (e) {
    console.error(`teams-notify (${opts.channel}) threw`, e);
    return { ok: false };
  }
}