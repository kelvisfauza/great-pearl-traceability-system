
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const useRoleBasedData = () => {
  const { employee, hasPermission, hasRole, isAdmin } = useAuth();

  const dataFilters = useMemo(() => {
    if (!employee) return null;

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
      isAdmin: isAdmin(),
      isManager: hasRole('Manager') || hasRole('Operations Manager'),
      isSupervisor: hasRole('Supervisor') || hasRole('Operations Manager'),
    };
  }, [employee, hasPermission, hasRole, isAdmin]);

  return dataFilters;
};
