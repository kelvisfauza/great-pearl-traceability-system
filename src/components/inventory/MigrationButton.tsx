import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database, CheckCircle, AlertCircle } from "lucide-react";
import { migrateInventoryToBatches } from "@/utils/migrateInventoryToBatches";
import { useToast } from "@/hooks/use-toast";

interface MigrationButtonProps {
  onMigrationComplete: () => void;
}

const MigrationButton = ({ onMigrationComplete }: MigrationButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    batchesCreated: number;
    recordsProcessed: number;
    totalKgMigrated: number;
  } | null>(null);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setIsLoading(true);
    setResult(null);

    const migrationResult = await migrateInventoryToBatches();
    setResult(migrationResult);
    setIsLoading(false);

    if (migrationResult.success && migrationResult.batchesCreated > 0) {
      toast({
        title: "Migration Complete",
        description: migrationResult.message
      });
      onMigrationComplete();
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="gap-2">
        <Database className="h-4 w-4" />
        Import Existing Stock
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Existing Inventory</DialogTitle>
            <DialogDescription>
              This will migrate your existing coffee inventory records into the new 20,000kg batch system.
              Records will be grouped by coffee type and organized into batches using FIFO order.
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
                {result.success && result.batchesCreated > 0 && (
                <div className="mt-2 text-sm">
                  <p>• Batches created: {result.batchesCreated}</p>
                  <p>• Records processed: {result.recordsProcessed}</p>
                  <p>• Total migrated: {result.totalKgMigrated.toLocaleString()} kg</p>
                </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMigrate} 
              disabled={isLoading || (result?.success && result.batchesCreated > 0)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : result?.success && result.batchesCreated > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed
                </>
              ) : (
                "Start Migration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MigrationButton;
