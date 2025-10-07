import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { backfillSalesTracking } from '@/utils/backfillSalesTracking';

export const BackfillSalesButton = () => {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleBackfill = async () => {
    setProcessing(true);
    try {
      const result = await backfillSalesTracking();
      
      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
        // Reload the page to show updated inventory
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Backfill failed:', error);
      toast({
        title: 'Backfill Failed',
        description: 'Failed to backfill sales tracking. Please check console for details.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button 
      onClick={handleBackfill} 
      disabled={processing}
      variant="outline"
      size="sm"
    >
      {processing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Backfill Sales Tracking
        </>
      )}
    </Button>
  );
};
