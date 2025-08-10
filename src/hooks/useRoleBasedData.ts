
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { useRoleAssignment } from './useRoleAssignment';

export const useRoleBasedData = () => {
  const { employee, hasPermission, hasRole, isAdmin } = useAuth();
  const { hasAssignedRole } = useRoleAssignment();

  const dataFilters = useMemo(() => {
    if (!employee) return null;

    const isAssignedApprover = hasAssignedRole(employee.id, 'approver');
    const isAssignedAdminDelegate = hasAssignedRole(employee.id, 'admin_delegate');

    return {
      // Financial data access
      canViewFinancialData: hasPermission('Finance') || isAdmin(),
      canViewSalaryData: hasPermission('Human Resources') || hasPermission('Finance') || isAdmin(),
      canViewExpenses: hasPermission('Finance') || isAdmin(),
      
      // HR data access
      canViewEmployeeData: hasPermission('Human Resources') || hasRole('Manager') || isAdmin(),
      canManageEmployees: hasPermission('Human Resources') || isAdmin(),
      
      // Operations data access
      canViewProcurement: hasPermission('Procurement') || hasRole('Manager') || isAdmin(),
      canViewQualityControl: hasPermission('Quality Control') || hasRole('Manager') || isAdmin(),
      canViewProcessing: hasPermission('Processing') || hasRole('Manager') || isAdmin(),
      canViewInventory: hasPermission('Inventory') || hasPermission('Store Management') || hasRole('Manager') || isAdmin(),
      
      // Management data access
      canViewReports: hasPermission('Reports') || hasRole('Manager') || hasRole('Operations Manager') || isAdmin(),
      canViewAnalytics: hasPermission('Data Analysis') || hasRole('Manager') || hasRole('Operations Manager') || isAdmin(),
      canViewDashboard: hasRole('Manager') || hasRole('Operations Manager') || hasRole('Supervisor') || isAdmin(),
      
      // Department-specific filters
      userDepartment: employee.department,
      userRole: employee.role,
      userPermissions: employee.permissions || [],
      
      // Admin access
      isAdmin: isAdmin() || isAssignedAdminDelegate,
      isManager: hasRole('Manager') || hasRole('Operations Manager'),
      isSupervisor: hasRole('Supervisor') || hasRole('Operations Manager'),
      
      // Assigned roles
      isAssignedApprover,
      isAssignedAdminDelegate,
      canApproveRequests: isAdmin() || hasRole('Manager') || hasRole('Operations Manager') || isAssignedApprover || isAssignedAdminDelegate,
    };
  }, [employee, hasPermission, hasRole, isAdmin, hasAssignedRole]);

  return dataFilters;
};
