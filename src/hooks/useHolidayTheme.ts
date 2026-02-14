import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HolidayTheme {
  id: string;
  name: string;
  holiday_date: string;
  greeting_title: string;
  greeting_message: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  bg_gradient_from: string;
  bg_gradient_to: string;
  is_active: boolean;
  is_recurring: boolean;
}

export const useHolidayTheme = () => {
  const today = new Date().toISOString().split("T")[0];
  const todayMonth = today.slice(5); // MM-DD

  return useQuery({
    queryKey: ["holiday-theme", today],
    queryFn: async (): Promise<HolidayTheme | null> => {
      // First try exact date match
      const { data: exactMatch } = await supabase
        .from("public_holidays")
        .select("*")
        .eq("holiday_date", today)
        .eq("is_active", true)
        .maybeSingle();

      if (exactMatch) return exactMatch as HolidayTheme;

      // For recurring holidays, check if any recurring holiday matches today's month-day
      const { data: allRecurring } = await supabase
        .from("public_holidays")
        .select("*")
        .eq("is_recurring", true)
        .eq("is_active", true);

      if (allRecurring) {
        const match = allRecurring.find((h) => {
          const hMonthDay = h.holiday_date.slice(5);
          return hMonthDay === todayMonth;
        });
        if (match) return match as HolidayTheme;
      }

      return null;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
