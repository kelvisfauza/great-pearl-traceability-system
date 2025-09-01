import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanyEmployee {
  id: string;
  employee_id: string;
  full_name: string;
  phone?: string;
  address?: string;
  position: string;
  department: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  hire_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayslip {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_id_number: string;
  pay_period_month: number;
  pay_period_year: number;
  base_salary: number;
  allowances: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  status: string;
  generated_date: string;
  created_at: string;
  updated_at: string;
}

export const useCompanyEmployees = () => {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [payslips, setPayslips] = useState<SalaryPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('company_employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching company employees:', error);
      toast({
        title: "Error",
        description: "Failed to fetch company employees",
        variant: "destructive",
      });
    }
  };

  const fetchPayslips = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_payslips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayslips(data || []);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payslips",
        variant: "destructive",
      });
    }
  };

  const addEmployee = async (employeeData: Omit<CompanyEmployee, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('company_employees')
        .insert([employeeData])
        .select()
        .single();

      if (error) throw error;

      setEmployees(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Employee added successfully",
      });
      return data;
    } catch (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<CompanyEmployee>) => {
    try {
      const { data, error } = await supabase
        .from('company_employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEmployees(prev => prev.map(emp => emp.id === id ? data : emp));
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(prev => prev.filter(emp => emp.id !== id));
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateMonthlyPayslips = async (month: number, year: number) => {
    try {
      const activeEmployees = employees.filter(emp => emp.status === 'Active');
      const newPayslips: Omit<SalaryPayslip, 'id' | 'created_at' | 'updated_at'>[] = [];

      for (const employee of activeEmployees) {
        // Check if payslip already exists for this employee and period
        const existingPayslip = payslips.find(
          p => p.employee_id === employee.id && 
               p.pay_period_month === month && 
               p.pay_period_year === year
        );

        if (!existingPayslip) {
          const grossSalary = employee.base_salary + employee.allowances;
          const netSalary = grossSalary - employee.deductions;

          newPayslips.push({
            employee_id: employee.id,
            employee_name: employee.full_name,
            employee_id_number: employee.employee_id,
            pay_period_month: month,
            pay_period_year: year,
            base_salary: employee.base_salary,
            allowances: employee.allowances,
            gross_salary: grossSalary,
            deductions: employee.deductions,
            net_salary: netSalary,
            status: 'Generated',
            generated_date: new Date().toISOString().split('T')[0],
          });
        }
      }

      if (newPayslips.length > 0) {
        const { data, error } = await supabase
          .from('salary_payslips')
          .insert(newPayslips)
          .select();

        if (error) throw error;

        setPayslips(prev => [...data, ...prev]);
        toast({
          title: "Success",
          description: `Generated ${newPayslips.length} payslips for ${new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        });
        return data;
      } else {
        toast({
          title: "Info",
          description: "All payslips for this period have already been generated",
        });
        return [];
      }
    } catch (error) {
      console.error('Error generating payslips:', error);
      toast({
        title: "Error",
        description: "Failed to generate payslips",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getEmployeeStats = () => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
    const inactiveEmployees = employees.filter(emp => emp.status !== 'Active').length;
    const totalMonthlySalary = employees
      .filter(emp => emp.status === 'Active')
      .reduce((sum, emp) => sum + emp.base_salary + emp.allowances, 0);

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalMonthlySalary,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchPayslips()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    employees,
    payslips,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    generateMonthlyPayslips,
    getEmployeeStats,
    refreshData: () => {
      fetchEmployees();
      fetchPayslips();
    },
  };
};