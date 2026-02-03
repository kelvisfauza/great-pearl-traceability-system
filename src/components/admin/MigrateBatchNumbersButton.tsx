import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { migrateBatchNumbersToNewFormat } from '@/utils/batchUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export const MigrateBatchNumbersButton: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [migrationDetails, setMigrationDetails] = useState<string[]>([]);
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; failed: number } | null>(null);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateBatchNumbersToNewFormat();
      setMigrationResult({ migrated: result.migrated, failed: result.failed });
      setMigrationDetails(result.details);

      if (result.migrated > 0 || result.failed > 0) {
        toast({
          title: result.failed > 0 ? 'Migration Completed with Errors' : 'Migration Successful',
          description: `Updated ${result.migrated} batch numbers. ${result.failed} failed.`,
          variant: result.failed > 0 ? 'destructive' : 'default',
        });
        setShowDetails(true);
      } else {
        toast({
          title: 'No Changes Needed',
          description: 'All batch numbers are already in the new format.',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: 'An error occurred during migration.',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Button
          onClick={handleMigrate}
          disabled={migrating}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
          {migrating ? 'Migrating...' : 'Migrate Batch Numbers'}
        </Button>
        {migrationResult && (
          <div className="flex items-center gap-2 text-sm">
            {migrationResult.failed === 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span>
              {migrationResult.migrated} migrated, {migrationResult.failed} failed
            </span>
            <Button variant="link" size="sm" onClick={() => setShowDetails(true)}>
              View Details
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Number Migration Details</DialogTitle>
            <DialogDescription>
              Migration results: {migrationResult?.migrated || 0} successful, {migrationResult?.failed || 0} failed
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-1 font-mono text-sm">
              {migrationDetails.length === 0 ? (
                <p className="text-muted-foreground">No changes were made.</p>
              ) : (
                migrationDetails.map((detail, index) => (
                  <div
                    key={index}
                    className={`p-1 rounded ${
                      detail.includes('Failed') || detail.includes('Error')
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted'
                    }`}
                  >
                    {detail}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
