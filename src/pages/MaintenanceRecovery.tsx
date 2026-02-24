import { useState } from 'react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

const MaintenanceRecovery = () => {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { isActive, deactivateWithKey } = useMaintenanceMode();

  const handleRecover = async () => {
    if (!code.trim() || !pin.trim()) {
      toast({ title: 'Missing fields', description: 'Please enter both the recovery code and PIN.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await deactivateWithKey(code.trim(), pin.trim());
      toast({ title: 'System Restored', description: 'Maintenance mode has been deactivated. All users can now access the system.' });
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch {
      toast({ title: 'Invalid Credentials', description: 'The recovery code or PIN is incorrect. Please check the SMS sent to the authorized phone.', variant: 'destructive' });
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
          <CardDescription>Enter the 10-digit recovery code and 4-digit PIN sent via SMS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>The system is currently in maintenance mode</span>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recovery-code">Recovery Code (10 digits)</Label>
            <Input
              id="recovery-code"
              placeholder="Enter 10-digit recovery code..."
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="font-mono text-center text-lg tracking-widest"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-pin">PIN (4 digits)</Label>
            <Input
              id="recovery-pin"
              placeholder="Enter 4-digit PIN..."
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="font-mono text-center text-lg tracking-widest"
              maxLength={4}
              type="password"
            />
          </div>

          <Button 
            onClick={handleRecover} 
            disabled={loading || code.length !== 10 || pin.length !== 4} 
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Restore System'}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            The recovery credentials were sent via SMS to the authorized administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceRecovery;
