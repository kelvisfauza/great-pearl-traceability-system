import React from 'react';
import { useGranularPermissions } from '@/hooks/useGranularPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionModule, PermissionAction } from '@/types/granularPermissions';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface PermissionGateProps {
  children: React.ReactNode;
  module: PermissionModule;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showDenied?: boolean;
}

/**
 * PermissionGate - Enforces granular permissions on UI elements
 * 
 * Usage:
 * <PermissionGate module="Finance" action="create">
 *   <Button>Create Transaction</Button>
 * </PermissionGate>
 * 
 * This will only render the button if user has "Finance:create" permission
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  module,
  action,
  fallback,
  showDenied = false
}) => {
  const { checkPermission } = useGranularPermissions();
  const { employee } = useAuth();

  if (!employee) {
    return showDenied ? (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Not authenticated</AlertDescription>
      </Alert>
    ) : null;
  }

  const hasPermission = checkPermission(module, action);

  if (!hasPermission) {
    if (fallback) return <>{fallback}</>;
    
    if (showDenied) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to {action} in {module}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const CanView: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="view">{children}</PermissionGate>
);

export const CanCreate: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="create">{children}</PermissionGate>
);

export const CanEdit: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="edit">{children}</PermissionGate>
);

export const CanDelete: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="delete">{children}</PermissionGate>
);

export const CanProcess: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="process">{children}</PermissionGate>
);

export const CanApprove: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="approve">{children}</PermissionGate>
);

export const CanPrint: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="print">{children}</PermissionGate>
);

export const CanExport: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="export">{children}</PermissionGate>
);

export const CanDownload: React.FC<{ module: PermissionModule; children: React.ReactNode }> = ({ module, children }) => (
  <PermissionGate module={module} action="download">{children}</PermissionGate>
);
