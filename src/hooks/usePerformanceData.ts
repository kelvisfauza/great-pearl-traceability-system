
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePerformanceData = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setIsLoading(true);
        const { data: metricsData, error: fetchError } = await supabase
          .from('metrics')
          .select('*')
          .eq('metric_type', 'performance')
          .eq('month', 'current')
          .order('category');

        if (fetchError) throw fetchError;

        const formattedData = metricsData?.map(metric => ({
          id: metric.id,
          category: metric.category,
          value: metric.value_numeric,
          target: metric.target,
          percentage: metric.percentage,
          trend: metric.trend,
          change_percentage: `${metric.change_percentage > 0 ? '+' : ''}${metric.change_percentage}%`,
          month: metric.month
        })) || [];

        setData(formattedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching performance data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  return {
    data,
    error,
    isLoading
  };
};
