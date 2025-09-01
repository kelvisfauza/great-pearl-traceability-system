import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { setEmployeeRole, PERMISSION_SETS } from '@/utils/updateEmployeePermissions';
import { fixDenisAccountFinal } from '@/utils/fixDenisAccountFinal';

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

  const handleUpdate = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await setEmployeeRole(email, roleType);
      toast({
        title: "Success",
        description: `Employee role updated to ${roleType}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee role",
        variant: "destructive"
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
      </CardContent>
    </Card>
  );
};

export default QuickEmployeeUpdate;