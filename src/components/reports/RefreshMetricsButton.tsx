import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const RefreshMetricsButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Triggering metrics calculation...");

      const { data, error } = await supabase.functions.invoke('calculate-metrics');

      if (error) throw error;

      console.log("✅ Metrics updated:", data);
      
      toast({
        title: "Metrics Updated",
        description: "Real-time metrics have been calculated from your operational data.",
      });

      // Refresh the page to show new data
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("❌ Error refreshing metrics:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh metrics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Calculating...' : 'Refresh Metrics'}
    </Button>
  );
};