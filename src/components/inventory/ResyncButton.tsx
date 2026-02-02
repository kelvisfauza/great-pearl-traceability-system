import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { resyncInventoryBatches } from "@/utils/resyncInventoryBatches";
import { useToast } from "@/hooks/use-toast";

interface ResyncButtonProps {
  onResyncComplete: () => void;
}

const ResyncButton = ({ onResyncComplete }: ResyncButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    totalAvailableKg: number;
    batchesUpdated: number;
    batchesCreated: number;
  } | null>(null);
  const { toast } = useToast();

  const handleResync = async () => {
    setIsLoading(true);
    setResult(null);

    const resyncResult = await resyncInventoryBatches();
    setResult(resyncResult);
    setIsLoading(false);

    if (resyncResult.success) {
      toast({
        title: "Resync Complete",
        description: resyncResult.message
      });
      onResyncComplete();
    } else {
      toast({
        title: "Resync Failed",
        description: resyncResult.message,
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Sync Stock
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Inventory with Actual Stock</DialogTitle>
            <DialogDescription>
              This will scan all coffee records in the store and ensure the inventory batches 
              reflect the actual available stock (excluding already sold coffee).
            </DialogDescription>
          </DialogHeader>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.message}
                {result.success && (
                  <div className="mt-2 text-sm">
                    <p>• Total available stock: {result.totalAvailableKg.toLocaleString()} kg</p>
                    {result.batchesCreated > 0 && <p>• New batches created: {result.batchesCreated}</p>}
                    {result.batchesUpdated > 0 && <p>• Records added to batches: {result.batchesUpdated}</p>}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {result?.success ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleResync} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResyncButton;
