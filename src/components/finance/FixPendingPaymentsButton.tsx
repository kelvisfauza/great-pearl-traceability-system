import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const FixPendingPaymentsButton = () => {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const handleFixPayments = async () => {
    try {
      setIsFixing(true);
      
      const { data, error } = await supabase.functions.invoke('fix-pending-payments');

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Payments Fixed",
          description: `Successfully updated ${data.fixed} out of ${data.total} pending payments`,
        });
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Failed to fix payments');
      }
    } catch (error) {
      console.error('Error fixing payments:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix pending payments",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      onClick={handleFixPayments}
      disabled={isFixing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
      {isFixing ? 'Fixing...' : 'Fix Pending Payments'}
    </Button>
  );
};
