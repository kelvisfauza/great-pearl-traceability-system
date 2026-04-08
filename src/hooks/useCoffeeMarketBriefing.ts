import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CoffeeMarketBriefing, CoffeeMarketSnapshot } from "@/components/display-tv/types";

interface BriefingState {
  briefing: CoffeeMarketBriefing | null;
  loading: boolean;
  error: string | null;
}

const fallbackBriefing: CoffeeMarketBriefing = {
  summary: "Coffee-market briefing is loading. Live ICE prices, internal buying prices, and external coffee headlines will appear automatically.",
  arabicaDirection: "neutral",
  robustaDirection: "neutral",
  bullishReasons: [
    "Export demand updates are being collected.",
    "Global supply headlines are being refreshed.",
    "Fresh coffee-market commentary is on the way.",
  ],
  bearishReasons: [
    "Macro and currency signals are being refreshed.",
    "Harvest and logistics headlines are being refreshed.",
    "Short-term downside risks are being recalculated.",
  ],
  headlines: [],
  updatedAt: new Date().toISOString(),
  source: "Live market briefing",
};

const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export const useCoffeeMarketBriefing = (snapshot: CoffeeMarketSnapshot) => {
  const [state, setState] = useState<BriefingState>({
    briefing: fallbackBriefing,
    loading: true,
    error: null,
  });

  // Use a ref so the interval always reads the latest snapshot without restarting
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const refresh = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke("coffee-market-briefing", {
        body: { marketSnapshot: snapshotRef.current },
      });

      if (error) {
        throw error;
      }

      setState({
        briefing: data as CoffeeMarketBriefing,
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh market briefing";
      setState((current) => ({
        briefing: current.briefing ?? fallbackBriefing,
        loading: false,
        error: message,
      }));
    }
  }, []);

  // Initial fetch + stable interval (doesn't restart on snapshot changes)
  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
