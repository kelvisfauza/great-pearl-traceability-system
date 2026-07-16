import { useCallback, useRef, useState } from "react";
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: AICommandResponse;
}

const EMPTY: AICommandResponse = {
  answer: "", records: [], navigations: [], creates: [], actions: [],
};

const SUPABASE_URL = "https://pudfybkyfedeggmokhco.supabase.co";

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Build history BEFORE adding this turn (server just needs prior context)
    const historyForServer = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "Please sign in again to use the AI assistant.",
          suggestions: { ...EMPTY, navigations: [{ label: "Sign in", url: "/auth" }] },
        }]);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query: q, messages: historyForServer }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("ai-search error", res.status, body);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: res.status === 401 || res.status === 403
            ? "Your session isn't authorized. Please sign in again."
            : "I hit a snag reaching the AI. Try again in a moment.",
        }]);
        return;
      }

      const payload = { ...EMPTY, ...(await res.json()) } as AICommandResponse;
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: payload.answer || "…",
        suggestions: payload,
      }]);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("AI chat error", e);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I couldn't reach the AI. Try again in a moment.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, loading, send, reset };
}