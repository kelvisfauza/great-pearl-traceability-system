import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for granular role-based UI permissions
 * Controls visibility and functionality of UI elements based on user role
 * 
 * Role Hierarchy:
 * 1. User - Data entry only, can view and create
 * 2. Supervisor - Can edit and export, but no print/approve/delete
 * 3. Manager - Can approve, print, delete
 * 4. Administrator - Can approve but limited system access
 * 5. Super Admin - Full system access
 */
export const useRolePermissions = () => {
  const { employee, canPerformAction, isSuperAdmin, isManager, isSupervisor, isUser } = useAuth();

  // UI visibility permissions
  const canSeeEditButton = canPerformAction('edit');
  const canSeeDeleteButton = canPerformAction('delete');
  const canSeePrintButton = canPerformAction('print');
  const canSeeApproveButton = canPerformAction('approve');
  const canSeeExportButton = canPerformAction('export');

  // Specific feature permissions
  const canEditRecords = canPerformAction('edit');
  const canDeleteRecords = canPerformAction('delete');
  const canApproveRequests = canPerformAction('approve');
  const canPrintReports = canPerformAction('print');
  const canExportData = canPerformAction('export');
  const canCreateRecords = canPerformAction('create');
  const canViewRecords = canPerformAction('view');

  // Department/module access (only Managers and above can see other departments)
  const canViewAllDepartments = !isUser() && !isSupervisor();
  const canManagePermissions = isSuperAdmin();
  const canManageRoles = isSuperAdmin();
  const canAccessSystemSettings = isSuperAdmin() || isManager();

  // Advanced permissions
  const canModifySystemData = isSuperAdmin() || isManager();
  const canViewSensitiveData = !isUser();
  const canPerformBulkOperations = canPerformAction('delete'); // Managers and above
  const canOverrideApprovals = isSuperAdmin();

  return {
    // UI visibility
    canSeeEditButton,
    canSeeDeleteButton,
    canSeePrintButton,
    canSeeApproveButton,
    canSeeExportButton,
    
    // Feature permissions
    canEditRecords,
    canDeleteRecords,
    canApproveRequests,
    canPrintReports,
    canExportData,
    canCreateRecords,
    canViewRecords,
    
    // Module access
    canViewAllDepartments,
    canManagePermissions,
    canManageRoles,
    canAccessSystemSettings,
    
    // Advanced
    canModifySystemData,
    canViewSensitiveData,
    canPerformBulkOperations,
    canOverrideApprovals,
    
    // Role checkers (for conditional rendering)
    isUser,
    isSupervisor,
    isManager,
    isSuperAdmin,
    
    // Current role name
    currentRole: employee?.role || 'User'
  };
};
