
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

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
  const { employee, hasPermission, hasRole, isSuperAdmin, isAdministrator } = useAuth();

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
    const isAdminUser = isAdministrator();
    const isManagerUser = hasRole('Manager') || hasRole('Operations Manager') || hasRole('Finance Manager') || hasRole('HR Manager');
    const isSupervisorUser = hasRole('Supervisor');
    
    // Determine role level
    let roleLevel: 'admin' | 'manager' | 'supervisor' | 'user' = 'user';
    if (isSuperAdminUser) roleLevel = 'admin';
    else if (isManagerUser) roleLevel = 'manager';
    else if (isSupervisorUser) roleLevel = 'supervisor';

    return {
      // Page access - Super Admin gets all, Administrator gets limited access
      canViewDashboard: true, // Everyone can see dashboard
      canViewEmployees: isSuperAdminUser || hasPermission('Human Resources') || isManagerUser,
      canViewFinance: isSuperAdminUser || hasPermission('Finance'),
      canViewHR: isSuperAdminUser || hasPermission('Human Resources'),
      canViewReports: isSuperAdminUser || hasPermission('Reports') || isAdminUser,
      canViewSettings: true, // Everyone can access settings (but with different tabs)
      canViewQuality: isSuperAdminUser || hasPermission('Quality Control'),
      canViewProcurement: isSuperAdminUser || hasPermission('Procurement'),
      canViewInventory: isSuperAdminUser || hasPermission('Inventory') || hasPermission('Store Management'),
      canViewProcessing: isSuperAdminUser || hasPermission('Processing'),
      canViewSales: isSuperAdminUser || hasPermission('Sales Marketing'),
      canViewFieldOps: isSuperAdminUser || hasPermission('Field Operations'),
      canViewLogistics: isSuperAdminUser || hasPermission('Logistics'),
      canViewAnalytics: isSuperAdminUser || hasPermission('Data Analysis'),
      
      // Action permissions - Administrators can approve but NOT modify/delete
      canCreateEmployees: isSuperAdminUser || hasPermission('Human Resources'),
      canEditEmployees: isSuperAdminUser || hasPermission('Human Resources'),
      canDeleteEmployees: isSuperAdminUser, // Only Super Admin can delete
      canProcessPayments: isSuperAdminUser || hasPermission('Finance'),
      canApproveRequests: isSuperAdminUser || isAdminUser || isManagerUser || isSupervisorUser, // Admins can approve
      canManageInventory: isSuperAdminUser || hasPermission('Inventory') || hasPermission('Store Management'),
      canViewSalaries: isSuperAdminUser || hasPermission('Finance') || hasPermission('Human Resources'),
      canGenerateReports: isSuperAdminUser || hasPermission('Reports'),
      canManageQuality: isSuperAdminUser || hasPermission('Quality Control'),
      canCreatePurchaseOrders: isSuperAdminUser || hasPermission('Procurement'),
      
      // Data filtering - Only Super Admin sees all data
      departmentFilter: isSuperAdminUser ? null : employee.department,
      roleLevel
    };
  }, [employee, hasPermission, hasRole, isSuperAdmin, isAdministrator]);
};
