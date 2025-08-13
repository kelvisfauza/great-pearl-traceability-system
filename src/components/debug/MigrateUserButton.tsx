import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { migrateKibabaUser } from '@/utils/migrateKibabaUser';

const MigrateUserButton = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleMigrate = async () => {
    setLoading(true);
    try {
      const result = await migrateKibabaUser();
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleMigrate} 
      disabled={loading}
      variant="outline"
      className="mt-4"
    >
      {loading ? 'Migrating...' : 'Migrate Kibaba User to Firebase'}
    </Button>
  );
};

export default MigrateUserButton;