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
import { Construction, AlertTriangle, MessageSquare } from 'lucide-react';
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
  const { isActive, reason, activatedBy, activatedAt, loading, toggleMaintenance } = useMaintenanceMode();
  const { employee } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [toggling, setToggling] = useState(false);

  const handleToggle = () => {
    if (isActive) {
      handleDeactivate();
    } else {
      setShowConfirm(true);
    }
  };

  const handleActivate = async () => {
    setToggling(true);
    try {
      await toggleMaintenance(true, maintenanceReason, employee?.name || 'Admin');
      setShowConfirm(false);
      setMaintenanceReason('');
      toast({
        title: 'Maintenance Mode Activated',
        description: 'All users have been logged out. Recovery code and PIN have been sent via SMS to the authorized administrator.',
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
      toast({
        title: 'System Restored',
        description: 'Maintenance mode has been deactivated. All users can now access the system.',
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to deactivate maintenance mode', variant: 'destructive' });
    } finally {
      setToggling(false);
    }
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
                  When activated, all users are logged out and the system becomes inaccessible.
                  Recovery code and PIN are sent via SMS.
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

            <div className="p-3 bg-primary/10 rounded-lg flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Recovery credentials sent via SMS</p>
                <p className="text-muted-foreground mt-1">
                  A 10-digit recovery code and 4-digit PIN were sent to the authorized administrator's phone.
                  Use them at the recovery page to restore the system.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

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
                <li>Send a recovery code and PIN via SMS to the authorized admin</li>
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
