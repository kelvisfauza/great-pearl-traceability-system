import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PermissionManagementModal from './PermissionManagementModal';
import { PERMISSION_DETAILS, type PermissionType } from '@/types/permissions';
import { 
  Shield, 
  Search, 
  Settings, 
  Users, 
  Filter,
  UserCog,
  RefreshCw
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: string;
  position: string;
  status: string;
  avatar_url?: string;
}

const UserPermissionsList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Filter employees based on search term
    const filtered = employees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [employees, searchTerm]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManagePermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handlePermissionsUpdated = () => {
    fetchEmployees();
    toast({
      title: "Success",
      description: "Employee permissions updated successfully",
    });
  };

  const getPermissionCount = (permissions: string[]) => {
    if (permissions.includes('*')) return 'All';
    return permissions.length.toString();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'Administrator': 'bg-red-100 text-red-800 border-red-200',
      'Manager': 'bg-purple-100 text-purple-800 border-purple-200',
      'Supervisor': 'bg-blue-100 text-blue-800 border-blue-200',
      'User': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only administrators can manage user permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Permissions Management
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEmployees}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading employees...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
                  </p>
                </div>
              ) : (
                filteredEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.avatar_url} alt={employee.name} />
                        <AvatarFallback className="bg-primary/10">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{employee.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={getRoleColor(employee.role)}
                          >
                            {employee.role}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {employee.position} • {employee.department}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getPermissionCount(employee.permissions)} permissions
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                          {employee.permissions.includes('*') ? (
                            <Badge variant="destructive" className="text-xs">
                              Administrator
                            </Badge>
                          ) : (
                            employee.permissions.slice(0, 3).map(permission => {
                              const details = PERMISSION_DETAILS[permission as PermissionType];
                              return (
                                <Badge key={permission} variant="secondary" className="text-xs">
                                  {details?.name || permission}
                                </Badge>
                              );
                            })
                          )}
                          {employee.permissions.length > 3 && !employee.permissions.includes('*') && (
                            <Badge variant="outline" className="text-xs">
                              +{employee.permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManagePermissions(employee)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PermissionManagementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={selectedEmployee}
        onPermissionsUpdated={handlePermissionsUpdated}
      />
    </>
  );
};

export default UserPermissionsList;