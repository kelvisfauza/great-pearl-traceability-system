import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Construction, Copy, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MaintenanceToggle = () => {
  const { isActive, reason, activatedBy, activatedAt, recoveryKey, loading, toggleMaintenance } = useMaintenanceMode();
  const { employee } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [currentRecoveryKey, setCurrentRecoveryKey] = useState('');
  const [toggling, setToggling] = useState(false);

  const recoveryUrl = `${window.location.origin}/maintenance-recovery`;

  const handleToggle = () => {
    if (isActive) {
      // Deactivating — just do it
      handleDeactivate();
    } else {
      // Activating — confirm first
      setShowConfirm(true);
    }
  };

  const handleActivate = async () => {
    setToggling(true);
    try {
      const key = await toggleMaintenance(true, maintenanceReason, employee?.name || 'Admin');
      setCurrentRecoveryKey(key || recoveryKey || '');
      setShowRecoveryKey(true);
      setShowConfirm(false);
      setMaintenanceReason('');
      toast({
        title: '🚧 Maintenance Mode Activated',
        description: 'All users have been logged out and the system is now inaccessible.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to activate maintenance mode', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  const handleDeactivate = async () => {
    setToggling(true);
    try {
      await toggleMaintenance(false);
      setShowRecoveryKey(false);
      toast({
        title: '✅ System Restored',
        description: 'Maintenance mode has been deactivated. All users can now access the system.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate maintenance mode', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Recovery link copied to clipboard' });
  };

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Construction className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle className="text-lg">System Maintenance Mode</CardTitle>
                <CardDescription>
                  When activated, all users are logged out and the system becomes inaccessible
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? 'destructive' : 'secondary'}>
                {isActive ? 'ACTIVE' : 'Inactive'}
              </Badge>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={toggling}
              />
            </div>
          </div>
        </CardHeader>

        {isActive && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="p-3 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">System is currently under maintenance</p>
                <p className="text-muted-foreground mt-1">
                  Activated by <strong>{activatedBy}</strong>
                  {activatedAt && ` at ${new Date(activatedAt).toLocaleString()}`}
                </p>
                {reason && <p className="text-muted-foreground mt-1">Reason: {reason}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Recovery URL (share with authorized personnel only)</Label>
              <div className="flex gap-2">
                <Input value={recoveryUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(recoveryUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {recoveryKey && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recovery Key</Label>
                <div className="flex gap-2">
                  <Input value={recoveryKey} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(recoveryKey)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Show recovery key after activation */}
      {showRecoveryKey && currentRecoveryKey && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">Save this recovery information!</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL and key to bring the system back online from any browser:
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={recoveryUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(recoveryUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Input value={currentRecoveryKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(currentRecoveryKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Activate Maintenance Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will immediately:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Log out all currently active users</li>
                <li>Block all access to the system</li>
                <li>Show a maintenance page to anyone who tries to access</li>
              </ul>
              <div className="pt-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  placeholder="e.g., Database migration, System update..."
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={toggling} className="bg-destructive hover:bg-destructive/90">
              {toggling ? 'Activating...' : 'Activate Maintenance Mode'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MaintenanceToggle;
