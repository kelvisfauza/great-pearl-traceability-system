
import React from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock } from 'lucide-react';

interface ProtectedContentProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  requiredDepartment?: string;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

const ProtectedContent: React.FC<ProtectedContentProps> = ({
  children,
  requiredPermission,
  requiredRole,
  requiredDepartment,
  fallback,
  showAccessDenied = true
}) => {
  const { employee, hasPermission, hasRole, isAdmin } = useAuth();
  const access = useRoleBasedAccess();

  if (!employee) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage reason="No employee profile found" /> : null);
  }

  // Check permission
  if (requiredPermission && !hasPermission(requiredPermission) && !isAdmin()) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage reason={`Missing permission: ${requiredPermission}`} /> : null);
  }

  // Check role
  if (requiredRole && !hasRole(requiredRole) && !isAdmin()) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage reason={`Missing role: ${requiredRole}`} /> : null);
  }

  // Check department
  if (requiredDepartment && employee.department !== requiredDepartment && !isAdmin()) {
    return fallback || (showAccessDenied ? <AccessDeniedMessage reason={`Wrong department: Required ${requiredDepartment}, you are in ${employee.department}`} /> : null);
  }

  return <>{children}</>;
};

const AccessDeniedMessage: React.FC<{ reason: string }> = ({ reason }) => {
  const { employee } = useAuth();
  
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <Lock className="h-5 w-5" />
          Access Denied
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-red-700 mb-4">{reason}</p>
        <div className="flex gap-2">
          <Badge variant="secondary">Your Role: {employee?.role}</Badge>
          <Badge variant="secondary">Department: {employee?.department}</Badge>
        </div>
        <p className="text-sm text-red-600 mt-2">
          Contact your administrator if you believe you should have access to this content.
        </p>
      </CardContent>
    </Card>
  );
};

export default ProtectedContent;
