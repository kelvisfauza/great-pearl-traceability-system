import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PERMISSIONS, PERMISSION_DETAILS, type PermissionType } from '@/types/permissions';
import { UserPlus, Shield, Plus } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  permissions: string[];
}

const QuickPermissionAssignment: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, permissions')
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAssignPermission = async () => {
    if (!selectedEmployee || !selectedPermission) {
      toast({
        title: "Missing Information",
        description: "Please select both an employee and a permission",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const employee = employees.find(e => e.id === selectedEmployee);
      if (!employee) throw new Error('Employee not found');

      const currentPermissions = employee.permissions || [];
      
      // Check if permission already exists
      if (currentPermissions.includes(selectedPermission)) {
        toast({
          title: "Permission Already Exists",
          description: `${employee.name} already has the ${selectedPermission} permission`,
          variant: "destructive"
        });
        return;
      }

      const newPermissions = [...currentPermissions, selectedPermission];

      const { error } = await supabase
        .from('employees')
        .update({
          permissions: newPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEmployee);

      if (error) throw error;

      toast({
        title: "Permission Assigned",
        description: `Successfully assigned ${selectedPermission} to ${employee.name}`,
      });

      // Reset selections and refresh data
      setSelectedEmployee('');
      setSelectedPermission('');
      await fetchEmployees();
    } catch (error: any) {
      console.error('Error assigning permission:', error);
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign permission",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePermissions = () => {
    if (!selectedEmployee) return [];
    
    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return [];

    return Object.values(PERMISSIONS).filter(permission => 
      !employee.permissions.includes(permission) && permission !== '*'
    );
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Quick Permission Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Employee Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Employee</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name} ({employee.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Permissions Display */}
        {selectedEmployeeData && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Permissions</label>
            <div className="flex flex-wrap gap-1">
              {selectedEmployeeData.permissions.length > 0 ? (
                selectedEmployeeData.permissions.map(permission => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {PERMISSION_DETAILS[permission as PermissionType]?.name || permission}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No permissions assigned</span>
              )}
            </div>
          </div>
        )}

        {/* Permission Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Permission</label>
          <Select 
            value={selectedPermission} 
            onValueChange={setSelectedPermission}
            disabled={!selectedEmployee}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a permission to add" />
            </SelectTrigger>
            <SelectContent>
              {getAvailablePermissions().map(permission => {
                const details = PERMISSION_DETAILS[permission];
                return (
                  <SelectItem key={permission} value={permission}>
                    <div className="flex flex-col">
                      <span>{details.name}</span>
                      <span className="text-xs text-muted-foreground">{details.description}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleAssignPermission}
          disabled={!selectedEmployee || !selectedPermission || loading}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? 'Assigning...' : 'Assign Permission'}
        </Button>

        {/* Helper Text */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <Shield className="h-3 w-3 inline mr-1" />
          This tool allows you to quickly add individual permissions to users. 
          For comprehensive permission management, use the full Permission Management interface.
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickPermissionAssignment;