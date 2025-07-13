
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallbackRoute?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallbackRoute = "/"
}) => {
  const { user, employee, loading, hasPermission, hasRole } = useAuth();

  console.log('ProtectedRoute - User:', user ? user.uid : 'No user');
  console.log('ProtectedRoute - Employee:', employee ? employee.name : 'No employee');
  console.log('ProtectedRoute - Loading:', loading);
  console.log('ProtectedRoute - Required permissions:', requiredPermissions);
  console.log('ProtectedRoute - Required roles:', requiredRoles);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to auth');
    return <Navigate to="/auth" replace />;
  }

  // Allow access while employee data is still loading
  if (!employee) {
    console.log('ProtectedRoute - No employee data yet, showing loading');
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Check if user has required permissions (only if permissions are specified)
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(permission));
    console.log('ProtectedRoute - Has required permission:', hasRequiredPermission);
    
    if (!hasRequiredPermission) {
      console.log('ProtectedRoute - Access denied - insufficient permissions');
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Check if user has required roles (only if roles are specified)
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    console.log('ProtectedRoute - Has required role:', hasRequiredRole);
    
    if (!hasRequiredRole) {
      console.log('ProtectedRoute - Access denied - insufficient role');
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  console.log('ProtectedRoute - Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
