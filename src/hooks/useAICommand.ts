import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AIRecord {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
  relevance?: number;
}
export interface AINavigation { label: string; url: string; }
export interface AITask {
  capability_id: string;
  kind: "create" | "action";
  label: string;
  summary: string;
  url: string;
  params?: Record<string, string>;
}
export interface AICommandResponse {
  answer: string;
  records: AIRecord[];
  navigations: AINavigation[];
  creates: AITask[];
  actions: AITask[];
}

const EMPTY: AICommandResponse = {
  answer: "", records: [], navigations: [], creates: [], actions: [],
};

export function useAICommand(query: string, debounceMs = 350) {
  const [data, setData] = useState<AICommandResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) { setData(EMPTY); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ query: q }),
          signal: abortRef.current.signal,
        },
      );
      if (!res.ok) throw new Error(`AI command failed: ${res.status}`);
      const payload = (await res.json()) as AICommandResponse;
      setData({ ...EMPTY, ...payload });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("AI command error", e);
      setError(e?.message ?? "AI command failed");
      setData({
        ...EMPTY,
        answer: "I couldn't reach the AI. Try again in a moment.",
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, loading, error, rerun: () => run(query) };
}