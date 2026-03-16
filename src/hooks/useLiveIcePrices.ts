import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LiveIcePrices } from "@/components/display-tv/types";

interface LiveIcePriceState {
  data: LiveIcePrices;
  loading: boolean;
  error: string | null;
}

const defaultData: LiveIcePrices = {
  iceArabica: null,
  iceRobusta: null,
  source: "Yahoo Finance",
};

export const useLiveIcePrices = () => {
  const [state, setState] = useState<LiveIcePriceState>({
    data: defaultData,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke("fetch-ice-prices", {
        body: {},
      });

      if (error) {
        throw error;
      }

      setState({
        data: {
          iceArabica: data?.data?.iceArabica ?? null,
          iceRobusta: data?.data?.iceRobusta ?? null,
          fetchedAt: data?.data?.fetchedAt,
          source: data?.data?.source || "Yahoo Finance",
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch live ICE prices";
      setState((current) => ({
        data: current.data,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
