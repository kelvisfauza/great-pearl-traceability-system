import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { migrateSupplierCodes } from '@/utils/migrateSupplierCodes';
import { useToast } from '@/hooks/use-toast';

interface MigrateSupplierCodesButtonProps {
  onComplete?: () => void;
}

export const MigrateSupplierCodesButton = ({ onComplete }: MigrateSupplierCodesButtonProps) => {
  const [migrating, setMigrating] = useState(false);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateSupplierCodes();
      
      if (result.success) {
        toast({
          title: "Codes Updated",
          description: `Updated ${result.updated} supplier codes to new format (GPC 00001, GPC 00002, etc.)`
        });
        onComplete?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update supplier codes",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier codes",
        variant: "destructive"
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleMigrate} 
      disabled={migrating}
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
      {migrating ? 'Updating...' : 'Fix Codes'}
    </Button>
  );
};
