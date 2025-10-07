import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { restoreFirebaseCoffeeRecords } from '@/utils/restoreFirebaseCoffeeRecords';

export const RestoreDataButton = () => {
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const result = await restoreFirebaseCoffeeRecords();
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: `Synced ${result.restoredCount} coffee records from Supabase to Firebase.`,
        });
        // Reload the page to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync coffee records. Please check console for details.',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Button 
      onClick={handleRestore} 
      disabled={restoring}
      variant="outline"
      size="sm"
    >
      {restoring ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Data
        </>
      )}
    </Button>
  );
};
