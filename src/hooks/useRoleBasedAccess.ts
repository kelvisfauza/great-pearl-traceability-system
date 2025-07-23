
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
    const isManagerUser = hasRole('Manager') || hasRole('Operations Manager');
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
      canViewFinance: isAdminUser || hasPermission('Finance') || (isManagerUser && employee.department === 'Finance'),
      canViewHR: isAdminUser || hasPermission('Human Resources') || (isManagerUser && employee.department === 'Human Resources'),
      canViewReports: isAdminUser || hasPermission('Reports') || isManagerUser,
      canViewSettings: true, // Everyone can access settings (but with different tabs)
      canViewQuality: isAdminUser || hasPermission('Quality Control') || employee.department === 'Quality Control' || isManagerUser,
      canViewProcurement: isAdminUser || hasPermission('Procurement') || employee.department === 'Procurement' || isManagerUser,
      canViewInventory: isAdminUser || hasPermission('Inventory') || hasPermission('Store Management') || employee.department === 'Inventory' || isManagerUser,
      canViewProcessing: isAdminUser || hasPermission('Processing') || employee.department === 'Processing' || isManagerUser,
      canViewSales: isAdminUser || employee.department === 'Sales' || isManagerUser,
      canViewFieldOps: isAdminUser || employee.department === 'Field Operations' || isManagerUser,
      canViewLogistics: isAdminUser || employee.department === 'Operations' || isManagerUser,
      canViewAnalytics: isAdminUser || hasPermission('Data Analysis') || isManagerUser,
      
      // Action permissions
      canCreateEmployees: isAdminUser || hasPermission('Human Resources'),
      canEditEmployees: isAdminUser || hasPermission('Human Resources'),
      canDeleteEmployees: isAdminUser,
      canProcessPayments: isAdminUser || hasPermission('Finance'),
      canApproveRequests: isAdminUser || isManagerUser || isSupervisorUser,
      canManageInventory: isAdminUser || hasPermission('Inventory') || hasPermission('Store Management') || (isManagerUser && employee.department === 'Inventory'),
      canViewSalaries: isAdminUser || hasPermission('Finance') || hasPermission('Human Resources'),
      canGenerateReports: isAdminUser || hasPermission('Reports') || isManagerUser,
      canManageQuality: isAdminUser || hasPermission('Quality Control') || (isManagerUser && employee.department === 'Quality Control'),
      canCreatePurchaseOrders: isAdminUser || hasPermission('Procurement') || (isManagerUser && employee.department === 'Procurement'),
      
      // Data filtering
      departmentFilter: isAdminUser ? null : employee.department,
      roleLevel
    };
  }, [employee, hasPermission, hasRole, isAdmin]);
};
