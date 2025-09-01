import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Shield, UserCheck, AlertTriangle } from 'lucide-react';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';

const PermissionOverview = () => {
  const { employees, loading } = useUnifiedEmployees();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate statistics
  const totalUsers = employees.length;
  const adminUsers = employees.filter(emp => emp.role === 'Administrator').length;
  const managerUsers = employees.filter(emp => emp.role === 'Manager').length;
  const activeUsers = employees.filter(emp => emp.status === 'Active').length;
  const usersWithLimitedAccess = employees.filter(emp => 
    emp.permissions && emp.permissions.length === 1 && emp.permissions[0] === 'General Access'
  ).length;

  // Permission distribution
  const permissionCounts = employees.reduce((acc: Record<string, number>, emp) => {
    (emp.permissions || []).forEach(permission => {
      acc[permission] = (acc[permission] || 0) + 1;
    });
    return acc;
  }, {});

  const topPermissions = Object.entries(permissionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6);

  // Role distribution
  const roleCounts = employees.reduce((acc: Record<string, number>, emp) => {
    acc[emp.role] = (acc[emp.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Administrators</p>
                <p className="text-2xl font-bold">{adminUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Limited Access</p>
                <p className="text-2xl font-bold">{usersWithLimitedAccess}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permission Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Permission Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topPermissions.map(([permission, count]) => {
              const percentage = (count / totalUsers) * 100;
              return (
                <div key={permission}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{permission}</span>
                    <span>{count} users ({percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={role === 'Administrator' ? 'destructive' : 
                                  role === 'Manager' ? 'default' : 'secondary'}>
                      {role}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{count} users</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Users by Department & Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set(employees.map(emp => emp.department))).map(department => {
              const deptEmployees = employees.filter(emp => emp.department === department);
              return (
                <Card key={department} className="p-4">
                  <h4 className="font-medium mb-3">{department}</h4>
                  <div className="space-y-2">
                    {deptEmployees.slice(0, 5).map(emp => (
                      <div key={emp.email} className="flex items-center justify-between text-sm">
                        <span className="truncate">{emp.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {emp.role}
                        </Badge>
                      </div>
                    ))}
                    {deptEmployees.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{deptEmployees.length - 5} more users
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionOverview;