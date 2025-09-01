import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { setEmployeeRole, PERMISSION_SETS } from '@/utils/updateEmployeePermissions';
import { fixDenisAccountFinal } from '@/utils/fixDenisAccountFinal';
import { updateKibabaPermissions } from '@/utils/updateKibabaPermissions';
import { forceRefreshUserSession } from '@/utils/forceRefreshUserSession';
import { syncSupabaseToFirebase } from '@/utils/syncSupabaseToFirebase';
import { resetKibabaPassword } from '@/utils/resetKibabaPassword';
import { cleanupAllUsers } from '@/utils/cleanupUsers';
import { supabase } from '@/integrations/supabase/client';

const QuickEmployeeUpdate = () => {
  const [email, setEmail] = useState('bwambaledenis8@gmail.com');
  const [roleType, setRoleType] = useState<keyof typeof PERMISSION_SETS>('USER');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFixDenis = async () => {
    setLoading(true);
    try {
      await fixDenisAccountFinal();
      toast({
        title: "Success",
        description: "Denis account authentication fixed completely",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix Denis account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKibabaPermissions = async () => {
    setLoading(true);
    try {
      const result = await updateKibabaPermissions();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Kibaba's permissions updated successfully.",
        });
        
        // Force refresh session after a short delay
        setTimeout(() => {
          forceRefreshUserSession('nicholusscottlangz@gmail.com');
        }, 1000);
      } else {
        toast({
          title: "Error",
          description: "Failed to update Kibaba's permissions",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating Kibaba permissions:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      await setEmployeeRole(email, roleType);
      toast({
        title: "Success",
        description: `Employee role updated to ${roleType}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update employee role",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefreshSession = async () => {
    setLoading(true);
    try {
      await forceRefreshUserSession('nicholusscottlangz@gmail.com');
      toast({
        title: "Success",
        description: "Session refresh initiated. Page will reload automatically.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetKibabaPassword = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-kibaba-password');
      
      if (error) {
        throw error;
      }
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Kibaba's password has been reset to 'Yedascott'. He can now login with this password.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: "An error occurred while resetting the password",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSupabaseToFirebase = async () => {
    setLoading(true);
    try {
      const result = await syncSupabaseToFirebase();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `${result.message}. Permissions synchronized across systems.`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to sync employee data between systems",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during synchronization",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupAllUsers = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete ALL users except the main account (nicholusscottlangz@gmail.com) from both Supabase and Firebase. This action cannot be undone. Are you sure?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await cleanupAllUsers();
      toast({
        title: "Success",
        description: `User cleanup completed. Deleted ${result.deletedCount} users, kept main account.`,
      });
    } catch (error) {
      console.error('Error cleaning up users:', error);
      toast({
        title: "Error",
        description: "Failed to cleanup users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Quick Employee Role Update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Employee Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="employee@example.com"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Role Type</label>
          <Select value={roleType} onValueChange={(value) => setRoleType(value as keyof typeof PERMISSION_SETS)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrator (All Permissions)</SelectItem>
              <SelectItem value="MANAGER">Manager (Full Access)</SelectItem>
              <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
              <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
              <SelectItem value="OPERATIONS_MANAGER">Operations Manager</SelectItem>
              <SelectItem value="DATA_ANALYST">Data Analyst</SelectItem>
              <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
              <SelectItem value="USER">Regular User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <p className="text-sm text-gray-600">
            Permissions: {PERMISSION_SETS[roleType].join(', ')}
          </p>
        </div>
        
        <Button 
          onClick={handleUpdate} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Updating...' : 'Update Employee Role'}
        </Button>
        
        <Button 
          onClick={handleFixDenis} 
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          {loading ? 'Fixing...' : 'Fix Denis Account Authentication'}
        </Button>

        <Button 
          onClick={handleUpdateKibabaPermissions}
          disabled={loading}
          variant="secondary"
          className="w-full"
        >
          {loading ? 'Updating...' : 'Fix Kibaba Permissions'}
        </Button>

        <Button 
          onClick={handleResetKibabaPassword}
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          {loading ? 'Resetting...' : 'Reset Kibaba Password (Yedascott)'}
        </Button>

        <Button 
          onClick={handleForceRefreshSession}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? 'Refreshing...' : 'Force Refresh Session'}
        </Button>

        <Button 
          onClick={handleSyncSupabaseToFirebase}
          disabled={loading}
          variant="default"
          className="w-full"
        >
          {loading ? 'Syncing...' : 'Sync Supabase → Firebase'}
        </Button>

        <Button 
          onClick={handleCleanupAllUsers}
          disabled={loading}
          variant="destructive"
          className="w-full"
        >
          {loading ? 'Cleaning...' : '🗑️ Delete All Users (Keep Main Account)'}
        </Button>

      </CardContent>
    </Card>
  );
};

export default QuickEmployeeUpdate;