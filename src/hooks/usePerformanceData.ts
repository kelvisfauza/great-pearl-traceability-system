
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePerformanceData = () => {
  return useQuery({
    queryKey: ["performance_data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_data")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};
