import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const MigrateBatchNumbersButton: React.FC = () => {
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ migrated: number; failed: number } | null>(null);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      // Call the database function that handles all records server-side
      const { data, error } = await supabase.rpc('migrate_batch_numbers_to_new_format');

      if (error) {
        console.error('Migration error:', error);
        toast({
          title: 'Migration Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const result = data as { migrated: number; failed: number };
      setMigrationResult(result);

      if (result.migrated > 0 || result.failed > 0) {
        toast({
          title: result.failed > 0 ? 'Migration Completed with Errors' : 'Migration Successful',
          description: `Updated ${result.migrated} batch numbers. ${result.failed} failed.`,
          variant: result.failed > 0 ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'No Changes Needed',
          description: 'All batch numbers are already in the new format (YYYYMMDD001).',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast({
        title: 'Migration Failed',
        description: 'An unexpected error occurred during migration.',
        variant: 'destructive',
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
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
        </div>
      )}
    </div>
  );
};
