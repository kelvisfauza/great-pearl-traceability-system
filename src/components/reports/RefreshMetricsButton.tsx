import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateMetricsFromFirebase } from "@/services/metricsCalculator";

export const RefreshMetricsButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Calculating metrics from Firebase data...");

      const result = await calculateMetricsFromFirebase();

      console.log("✅ Metrics updated:", result);
      
      toast({
        title: "Metrics Updated",
        description: `Calculated from ${result.metrics.totalBags} bags, ${result.metrics.activeSuppliers} suppliers, and UGX ${(result.metrics.revenue / 1_000_000).toFixed(1)}M in revenue`,
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