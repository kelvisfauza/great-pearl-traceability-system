
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMetrics = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        
        // First, get the most recent date
        const { data: latestMetric } = await supabase
          .from('metrics')
          .select('date_recorded')
          .eq('metric_type', 'key_metric')
          .order('date_recorded', { ascending: false })
          .limit(1)
          .single();

        if (!latestMetric?.date_recorded) {
          setData([]);
          setIsLoading(false);
          return;
        }

        // Fetch only metrics from the most recent date
        const { data: metricsData, error: fetchError } = await supabase
          .from('metrics')
          .select('*')
          .eq('metric_type', 'key_metric')
          .eq('date_recorded', latestMetric.date_recorded)
          .order('category');

        if (fetchError) throw fetchError;

        const formattedData = metricsData?.map(metric => ({
          id: metric.id,
          label: metric.label,
          value: metric.value_text,
          change_percentage: metric.change_percentage,
          trend: metric.trend,
          icon: metric.icon,
          color: metric.color,
          category: metric.category
        })) || [];

        setData(formattedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return {
    data,
    error,
    isLoading
  };
};
