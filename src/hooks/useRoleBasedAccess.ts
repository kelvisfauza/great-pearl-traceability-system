
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { useGranularPermissions } from './useGranularPermissions';
import { PERMISSION_MODULES } from '@/types/granularPermissions';

interface RoleBasedAccess {
  // Page access
  canViewDashboard: boolean;
  canViewEmployees: boolean;
  canViewFinance: boolean;
  canViewHR: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;
  canViewQuality: boolean;
  canViewProcurement: boolean;
  canViewInventory: boolean;
  canViewProcessing: boolean;
  canViewSales: boolean;
  canViewFieldOps: boolean;
  canViewLogistics: boolean;
  canViewAnalytics: boolean;
  
  // Action permissions
  canCreateEmployees: boolean;
  canEditEmployees: boolean;
  canDeleteEmployees: boolean;
  canProcessPayments: boolean;
  canApproveRequests: boolean;
  canManageInventory: boolean;
  canViewSalaries: boolean;
  canGenerateReports: boolean;
  canManageQuality: boolean;
  canCreatePurchaseOrders: boolean;
  
  // Data filtering
  departmentFilter: string | null;
  roleLevel: 'admin' | 'manager' | 'supervisor' | 'user';
}

export const useRoleBasedAccess = (): RoleBasedAccess => {
  const { employee, hasPermission, hasRole, isSuperAdmin, isAdministrator, isManager, isSupervisor, canPerformAction } = useAuth();
  const { canEdit: canEditQuality } = useGranularPermissions();

  return useMemo(() => {
    if (!employee) {
      return {
        canViewDashboard: false,
        canViewEmployees: false,
        canViewFinance: false,
        canViewHR: false,
        canViewReports: false,
        canViewSettings: false,
        canViewQuality: false,
        canViewProcurement: false,
        canViewInventory: false,
        canViewProcessing: false,
        canViewSales: false,
        canViewFieldOps: false,
        canViewLogistics: false,
        canViewAnalytics: false,
        canCreateEmployees: false,
        canEditEmployees: false,
        canDeleteEmployees: false,
        canProcessPayments: false,
        canApproveRequests: false,
        canManageInventory: false,
        canViewSalaries: false,
        canGenerateReports: false,
        canManageQuality: false,
        canCreatePurchaseOrders: false,
        departmentFilter: null,
        roleLevel: 'user'
      };
    }

    const isSuperAdminUser = isSuperAdmin();
    const isManagerUser = isManager();
    const isSupervisorUser = isSupervisor();
    const isAdminUser = isAdministrator();
    
    // Determine role level
    let roleLevel: 'admin' | 'manager' | 'supervisor' | 'user' = 'user';
    if (isSuperAdminUser) roleLevel = 'admin';
    else if (isManagerUser) roleLevel = 'manager';
    else if (isSupervisorUser) roleLevel = 'supervisor';

    return {
      // Page access - Based on permissions and role
      canViewDashboard: true, // Everyone can see dashboard
      canViewEmployees: isSuperAdminUser || isManagerUser || hasPermission('Human Resources'),
      canViewFinance: isSuperAdminUser || isManagerUser || hasPermission('Finance'),
      canViewHR: isSuperAdminUser || isManagerUser || hasPermission('Human Resources'),
      canViewReports: canPerformAction('view') && (hasPermission('Reports') || isSuperAdminUser || isManagerUser || isAdminUser),
      canViewSettings: true, // Everyone can access settings (but with different tabs)
      canViewQuality: isSuperAdminUser || isManagerUser || hasPermission('Quality Control'),
      canViewProcurement: isSuperAdminUser || isManagerUser || hasPermission('Procurement'),
      canViewInventory: isSuperAdminUser || isManagerUser || hasPermission('Inventory') || hasPermission('Store Management'),
      canViewProcessing: isSuperAdminUser || isManagerUser || hasPermission('Processing'),
      canViewSales: isSuperAdminUser || isManagerUser || hasPermission('Sales Marketing'),
      canViewFieldOps: isSuperAdminUser || isManagerUser || hasPermission('Field Operations'),
      canViewLogistics: isSuperAdminUser || isManagerUser || hasPermission('Logistics'),
      canViewAnalytics: isSuperAdminUser || isManagerUser || hasPermission('Data Analysis'),
      
      // Action permissions - Based on role hierarchy
      canCreateEmployees: canPerformAction('create') && (isSuperAdminUser || isManagerUser || hasPermission('Human Resources')),
      canEditEmployees: canPerformAction('edit') && (isSuperAdminUser || isManagerUser || hasPermission('Human Resources')),
      canDeleteEmployees: canPerformAction('delete') && isSuperAdminUser, // Only Super Admin can delete
      canProcessPayments: canPerformAction('edit') && (isSuperAdminUser || isManagerUser || hasPermission('Finance')),
      canApproveRequests: canPerformAction('approve'), // Managers, Administrators, Super Admin
      canManageInventory: canPerformAction('edit') && (isSuperAdminUser || isManagerUser || hasPermission('Inventory') || hasPermission('Store Management')),
      canViewSalaries: isSuperAdminUser || isManagerUser || hasPermission('Finance') || hasPermission('Human Resources'),
      canGenerateReports: canPerformAction('print') || canPerformAction('export'), // Managers and above can generate
      canManageQuality: isSuperAdminUser || isManagerUser || (hasPermission('Quality Control') && canEditQuality(PERMISSION_MODULES.QUALITY)),
      canCreatePurchaseOrders: canPerformAction('create') && (isSuperAdminUser || isManagerUser || hasPermission('Procurement')),
      
      // Data filtering - Supervisors and Users see only their department
      departmentFilter: (isSuperAdminUser || isManagerUser || isAdminUser) ? null : employee.department,
      roleLevel
    };
  }, [employee, hasPermission, hasRole, isSuperAdmin, isAdministrator, isManager, isSupervisor, canPerformAction]);
};
