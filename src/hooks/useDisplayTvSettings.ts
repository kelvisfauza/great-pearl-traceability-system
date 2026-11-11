import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DisplayCustomSlide { title: string; body: string }
export interface DisplayTvSettings { speed: number; ticker_items: string[]; custom_slides: DisplayCustomSlide[]; hidden_slides: string[] }
export const DEFAULT_DISPLAY_SETTINGS: DisplayTvSettings = { speed: 1.5, ticker_items: [], custom_slides: [], hidden_slides: [] };

/** Slide time on screen: base duration divided by speed, never under 4 seconds. */
export const scaledDuration = (base: number, speed: number) =>
  Math.max(4000, Math.round(base / (speed > 0 ? speed : 1)));

export const useDisplayTvSettings = () => {
  const [settings, setSettings] = useState<DisplayTvSettings>(DEFAULT_DISPLAY_SETTINGS);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await (supabase as any).from('display_tv_settings').select('speed, ticker_items, custom_slides, hidden_slides').eq('id', 1).maybeSingle();
      if (active && data) setSettings({ speed: Number(data.speed) || 1.5, ticker_items: data.ticker_items ?? [], custom_slides: Array.isArray(data.custom_slides) ? data.custom_slides : [], hidden_slides: data.hidden_slides ?? [] });
    };
    void load();
    const t = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(t); };
  }, []);
  return settings;
};
