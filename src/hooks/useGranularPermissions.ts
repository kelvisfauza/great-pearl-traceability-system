import { useAuth } from '@/contexts/AuthContext';
import {
  hasGranularPermission,
  getUserModuleActions,
  type PermissionModule,
  type PermissionAction,
  PERMISSION_ACTIONS,
} from '@/types/granularPermissions';

export const useGranularPermissions = () => {
  const { employee, isAdmin } = useAuth();

  const checkPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    if (isAdmin()) return true;
    if (!employee) return false;
    
    return hasGranularPermission(employee.permissions || [], module, action);
  };

  const getModuleActions = (module: PermissionModule): PermissionAction[] => {
    if (isAdmin()) return Object.values(PERMISSION_ACTIONS);
    if (!employee) return [];
    
    return getUserModuleActions(employee.permissions || [], module);
  };

  const canView = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.VIEW);
  const canCreate = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.CREATE);
  const canEdit = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.EDIT);
  const canDelete = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.DELETE);
  const canProcess = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.PROCESS);
  const canApprove = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.APPROVE);
  const canDownload = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.DOWNLOAD);
  const canExport = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.EXPORT);
  const canPrint = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.PRINT);
  const canManage = (module: PermissionModule) => checkPermission(module, PERMISSION_ACTIONS.MANAGE);

  return {
    checkPermission,
    getModuleActions,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canProcess,
    canApprove,
    canDownload,
    canExport,
    canPrint,
    canManage,
  };
};
