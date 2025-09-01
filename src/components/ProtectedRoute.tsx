
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallbackRoute?: string;
  showAccessDenied?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallbackRoute = "/",
  showAccessDenied = true
}) => {
  const { user, employee, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If we have a user but no employee data, create a basic employee or show error
  if (!employee) {
    // For authenticated users without employee records, redirect to auth
    // This handles cases where the user exists but has no employee profile
    return <Navigate to="/auth" replace />;
  }

  // Check if user has required permissions (only if permissions are specified)
  if (requiredPermissions.length > 0) {
    console.log('🔒 DEBUGGING PERMISSION CHECK:', {
      userEmail: user?.email,
      employeeName: employee?.name,
      employeeRole: employee?.role,
      employeePermissions: employee?.permissions,
      requiredPermissions: requiredPermissions,
      route: window.location.pathname
    });
    
    // Check each permission individually for debugging
    const permissionResults = requiredPermissions.map(permission => {
      const hasIt = hasPermission(permission);
      console.log(`🔒 Permission "${permission}": ${hasIt ? '✅ GRANTED' : '❌ DENIED'}`);
      return { permission, hasIt };
    });
    
    const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(permission));
    
    console.log('🔒 FINAL RESULT:', { 
      hasRequiredPermission,
      permissionResults,
      willGrantAccess: hasRequiredPermission
    });
    
    if (!hasRequiredPermission) {
      console.log('🚫 ACCESS DENIED - Showing access denied screen');
      
      if (showAccessDenied) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-6">
                  You don't have the required permissions to access this page. 
                  Required permissions: {requiredPermissions.join(', ')}
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  <p>Your current permissions: {employee?.permissions?.join(', ') || 'None'}</p>
                  <p>Your role: {employee?.role || 'None'}</p>
                </div>
                <button 
                  onClick={() => window.history.back()} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        );
      }
      
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Check if user has required roles (only if roles are specified)
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      
      if (showAccessDenied) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
            <div className="max-w-md w-full mx-4">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                <p className="text-gray-600 mb-6">
                  You don't have the required role to access this page. 
                  Required roles: {requiredRoles.join(', ')}
                </p>
                <button 
                  onClick={() => window.history.back()} 
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        );
      }
      
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
