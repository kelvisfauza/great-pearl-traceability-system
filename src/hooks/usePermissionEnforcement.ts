import { useGranularPermissions } from './useGranularPermissions';
import { PermissionModule, PERMISSION_ACTIONS } from '@/types/granularPermissions';
import { toast } from 'sonner';

/**
 * Hook to enforce permissions with user feedback
 * 
 * Usage in components:
 * const { enforceAction } = usePermissionEnforcement();
 * 
 * const handleCreate = () => {
 *   if (!enforceAction('Finance', 'create')) return;
 *   // Proceed with create action
 * };
 */
export const usePermissionEnforcement = () => {
  const { checkPermission } = useGranularPermissions();

  const enforceAction = (
    module: PermissionModule,
    action: keyof typeof PERMISSION_ACTIONS,
    options?: {
      showToast?: boolean;
      customMessage?: string;
    }
  ): boolean => {
    const actionValue = PERMISSION_ACTIONS[action.toUpperCase() as keyof typeof PERMISSION_ACTIONS];
    const hasPermission = checkPermission(module, actionValue);

    if (!hasPermission && options?.showToast !== false) {
      const message = options?.customMessage || 
        `You don't have permission to ${action} in ${module}. Contact your administrator.`;
      
      toast.error('Permission Denied', {
        description: message,
      });
    }

    return hasPermission;
  };

  const enforceView = (module: PermissionModule) => 
    enforceAction(module, 'VIEW', { showToast: false });
    
  const enforceCreate = (module: PermissionModule) => 
    enforceAction(module, 'CREATE');
    
  const enforceEdit = (module: PermissionModule) => 
    enforceAction(module, 'EDIT');
    
  const enforceDelete = (module: PermissionModule) => 
    enforceAction(module, 'DELETE');
    
  const enforceProcess = (module: PermissionModule) => 
    enforceAction(module, 'PROCESS');
    
  const enforceApprove = (module: PermissionModule) => 
    enforceAction(module, 'APPROVE');
    
  const enforceDownload = (module: PermissionModule) => 
    enforceAction(module, 'DOWNLOAD');
    
  const enforceExport = (module: PermissionModule) => 
    enforceAction(module, 'EXPORT');
    
  const enforcePrint = (module: PermissionModule) => 
    enforceAction(module, 'PRINT');

  return {
    enforceAction,
    enforceView,
    enforceCreate,
    enforceEdit,
    enforceDelete,
    enforceProcess,
    enforceApprove,
    enforceDownload,
    enforceExport,
    enforcePrint,
  };
};
