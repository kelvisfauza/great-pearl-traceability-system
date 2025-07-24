
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
  const { employee, hasPermission, hasRole, isAdmin } = useAuth();

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

    const isAdminUser = isAdmin();
    const isManagerUser = hasRole('Manager') || hasRole('Operations Manager') || hasRole('Finance Manager') || hasRole('HR Manager');
    const isSupervisorUser = hasRole('Supervisor');
    
    // Determine role level
    let roleLevel: 'admin' | 'manager' | 'supervisor' | 'user' = 'user';
    if (isAdminUser) roleLevel = 'admin';
    else if (isManagerUser) roleLevel = 'manager';
    else if (isSupervisorUser) roleLevel = 'supervisor';

    return {
      // Page access
      canViewDashboard: true, // Everyone can see dashboard
      canViewEmployees: isAdminUser || hasPermission('Human Resources') || isManagerUser,
      canViewFinance: isAdminUser || hasPermission('Finance'),
      canViewHR: isAdminUser || hasPermission('Human Resources'),
      canViewReports: isAdminUser || hasPermission('Reports'),
      canViewSettings: true, // Everyone can access settings (but with different tabs)
      canViewQuality: isAdminUser || hasPermission('Quality Control'),
      canViewProcurement: isAdminUser || hasPermission('Procurement'),
      canViewInventory: isAdminUser || hasPermission('Inventory') || hasPermission('Store Management'),
      canViewProcessing: isAdminUser || hasPermission('Processing'),
      canViewSales: isAdminUser || hasPermission('Sales Marketing'),
      canViewFieldOps: isAdminUser || hasPermission('Field Operations'),
      canViewLogistics: isAdminUser || hasPermission('Logistics'),
      canViewAnalytics: isAdminUser || hasPermission('Data Analysis'),
      
      // Action permissions
      canCreateEmployees: isAdminUser || hasPermission('Human Resources'),
      canEditEmployees: isAdminUser || hasPermission('Human Resources'),
      canDeleteEmployees: isAdminUser,
      canProcessPayments: isAdminUser || hasPermission('Finance'),
      canApproveRequests: isAdminUser || isManagerUser || isSupervisorUser,
      canManageInventory: isAdminUser || hasPermission('Inventory') || hasPermission('Store Management'),
      canViewSalaries: isAdminUser || hasPermission('Finance') || hasPermission('Human Resources'),
      canGenerateReports: isAdminUser || hasPermission('Reports'),
      canManageQuality: isAdminUser || hasPermission('Quality Control'),
      canCreatePurchaseOrders: isAdminUser || hasPermission('Procurement'),
      
      // Data filtering
      departmentFilter: isAdminUser ? null : employee.department,
      roleLevel
    };
  }, [employee, hasPermission, hasRole, isAdmin]);
};
