import { useState } from 'react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

const MaintenanceRecovery = () => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { isActive, deactivateWithKey } = useMaintenanceMode();

  const handleRecover = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      await deactivateWithKey(key.trim());
      toast({ title: 'System Restored', description: 'Maintenance mode has been deactivated. All users can now access the system.' });
      // Redirect to home after short delay
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch {
      toast({ title: 'Invalid Key', description: 'The recovery key is incorrect. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">System is Online</h2>
            <p className="text-muted-foreground">The system is not currently in maintenance mode.</p>
            <Button onClick={() => window.location.href = '/'}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Maintenance Recovery</CardTitle>
          <CardDescription>Enter the recovery key to bring the system back online</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>The system is currently in maintenance mode</span>
          </div>
          <Input
            placeholder="Enter recovery key..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRecover()}
            className="font-mono"
          />
          <Button onClick={handleRecover} disabled={loading || !key.trim()} className="w-full">
            {loading ? 'Verifying...' : 'Restore System'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceRecovery;
