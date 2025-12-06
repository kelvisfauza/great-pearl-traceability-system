import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Download,
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  UserCheck,
  Building2
} from 'lucide-react';

import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { useCompanyEmployees } from '@/hooks/useCompanyEmployees';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeList from '@/components/hr/EmployeeList';
import EmployeeStatsCards from '@/components/hr/EmployeeStatsCards';
import AddEmployeeModal from '@/components/hr/AddEmployeeModal';
import EmployeeDetailsModal from '@/components/hr/EmployeeDetailsModal';
import EmployeeFilters from '@/components/hr/EmployeeFilters';
import EmptyState from '@/components/hr/EmptyState';
import RegistrationRequestsManager from '@/components/hr/RegistrationRequestsManager';
import PrintCredentialsDialog from '@/components/hr/PrintCredentialsDialog';
import SalaryPaymentRequestsManager from '@/components/hr/SalaryPaymentRequestsManager';
import MySalaryRequests from '@/components/MySalaryRequests';
import UserCreationForm from '@/components/hr/UserCreationForm';
import PrintUserDetails from '@/components/hr/PrintUserDetails';
import CreateTrainingAccountButton from '@/components/admin/CreateTrainingAccountButton';
import RoleManagement from '@/components/hr/RoleManagement';
import AccountStatusManager from '@/components/admin/AccountStatusManager';
import CompanyEmployeesList from '@/components/hr/CompanyEmployeesList';
import CompanyEmployeesStats from '@/components/hr/CompanyEmployeesStats';
import AddCompanyEmployeeModal from '@/components/hr/AddCompanyEmployeeModal';
import PayslipGenerator from '@/components/hr/PayslipGenerator';
import { OvertimeAwardModal } from '@/components/admin/OvertimeAwardModal';
import { OvertimeClaimsManager } from '@/components/admin/OvertimeClaimsManager';

const HumanResources = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showCompanyEmployeeModal, setShowCompanyEmployeeModal] = useState(false);
  const [selectedCompanyEmployee, setSelectedCompanyEmployee] = useState<any>(null);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);

  const { 
    employees, 
    loading, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee,
    searchEmployees,
    getEmployeeByEmail,
    stats
  } = useUnifiedEmployees();

  const {
    employees: companyEmployees,
    payslips,
    loading: companyLoading,
    addEmployee: addCompanyEmployee,
    updateEmployee: updateCompanyEmployee,
    deleteEmployee: deleteCompanyEmployee,
    generateMonthlyPayslips,
    getEmployeeStats
  } = useCompanyEmployees();

  const { canManageEmployees, isAdmin } = useAuth();

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowAddModal(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(employeeId);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleAddEmployee = async (employeeData: any) => {
    try {
      if (selectedEmployee) {
        await updateEmployee(selectedEmployee.id, employeeData);
      } else {
        await createEmployee(employeeData);
      }
      setShowAddModal(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  };

  const handlePrintCredentials = (employee: any) => {
    setSelectedEmployee(employee);
    setShowPrintDialog(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  // Company Employee handlers
  const handleAddCompanyEmployee = () => {
    setSelectedCompanyEmployee(null);
    setShowCompanyEmployeeModal(true);
  };

  const handleEditCompanyEmployee = (employee: any) => {
    setSelectedCompanyEmployee(employee);
    setShowCompanyEmployeeModal(true);
  };

  const handleSaveCompanyEmployee = async (employeeData: any) => {
    if (selectedCompanyEmployee) {
      await updateCompanyEmployee(selectedCompanyEmployee.id, employeeData);
    } else {
      await addCompanyEmployee(employeeData);
    }
  };

  const companyStats = getEmployeeStats();

  if (!canManageEmployees()) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <Users className="h-12 w-12 mx-auto text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access Human Resources management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-1 sm:mb-2">Human Resources</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employees, track performance, and handle HR operations</p>
        </div>

        <Tabs defaultValue="employees" className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-muted/50 p-1 rounded-xl gap-1">
              <TabsTrigger value="employees" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">System Users</TabsTrigger>
              <TabsTrigger value="company-employees" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Company</TabsTrigger>
              <TabsTrigger value="payslips" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Payslips</TabsTrigger>
              <TabsTrigger value="roles" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Roles</TabsTrigger>
              <TabsTrigger value="account-status" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Account</TabsTrigger>
              <TabsTrigger value="create" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Create</TabsTrigger>
              <TabsTrigger value="print-details" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Print</TabsTrigger>
              <TabsTrigger value="requests" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Requests</TabsTrigger>
              <TabsTrigger value="payments" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Salary</TabsTrigger>
              <TabsTrigger value="my-salary" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">My Salary</TabsTrigger>
              <TabsTrigger value="overtime" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Overtime</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="employees" className="space-y-6">
            <EmployeeStatsCards employees={employees} />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Employee Directory
                    </CardTitle>
                    <CardDescription>
                      Manage employee information and access controls
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddModal(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <EmployeeFilters 
                      departmentFilter={departmentFilter}
                      roleFilter={roleFilter}
                      statusFilter={statusFilter}
                      onDepartmentChange={setDepartmentFilter}
                      onRoleChange={setRoleFilter}
                      onStatusChange={setStatusFilter}
                      onReset={resetFilters}
                    />
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading employees...</p>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <EmptyState 
                      searchTerm={searchTerm}
                      hasEmployees={employees.length > 0}
                      onAddEmployee={() => setShowAddModal(true)}
                      onResetFilters={resetFilters}
                    />
                  ) : (
                    <EmployeeList
                      employees={filteredEmployees}
                      onViewEmployee={handleViewEmployee}
                      onEditEmployee={handleEditEmployee}
                      onDeleteEmployee={handleDeleteEmployee}
                      onPrintCredentials={handlePrintCredentials}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company-employees" className="space-y-6">
            <CompanyEmployeesStats stats={companyStats} />
            <CompanyEmployeesList
              employees={companyEmployees}
              onAddEmployee={handleAddCompanyEmployee}
              onEditEmployee={handleEditCompanyEmployee}
              onDeleteEmployee={deleteCompanyEmployee}
              loading={companyLoading}
            />
          </TabsContent>

          <TabsContent value="payslips">
            <PayslipGenerator
              payslips={payslips}
              onGeneratePayslips={generateMonthlyPayslips}
              loading={companyLoading}
            />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="account-status">
            <AccountStatusManager />
          </TabsContent>

          <TabsContent value="create">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UserCreationForm />
              <CreateTrainingAccountButton />
            </div>
          </TabsContent>

          <TabsContent value="print-details">
            <PrintUserDetails employees={employees} />
          </TabsContent>

          <TabsContent value="requests">
            <RegistrationRequestsManager />
          </TabsContent>
          
          <TabsContent value="payments">
            <SalaryPaymentRequestsManager />
          </TabsContent>
          
          <TabsContent value="my-salary">
            <MySalaryRequests employees={employees} />
          </TabsContent>

          <TabsContent value="overtime" className="space-y-6">
            {isAdmin() && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Overtime Management</span>
                    <Button onClick={() => setShowOvertimeModal(true)}>
                      Award Overtime
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Award overtime to employees and manage claims
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            <OvertimeClaimsManager />
          </TabsContent>
        </Tabs>

        <AddEmployeeModal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setSelectedEmployee(null);
          }}
          onAddEmployee={handleAddEmployee}
          employee={selectedEmployee}
        />

        <EmployeeDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          employee={selectedEmployee}
        />

        <PrintCredentialsDialog
          isOpen={showPrintDialog}
          onClose={() => {
            setShowPrintDialog(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
        />

        <AddCompanyEmployeeModal
          isOpen={showCompanyEmployeeModal}
          onClose={() => {
            setShowCompanyEmployeeModal(false);
            setSelectedCompanyEmployee(null);
          }}
          onSubmit={handleSaveCompanyEmployee}
          employee={selectedCompanyEmployee}
        />

        <OvertimeAwardModal
          open={showOvertimeModal}
          onOpenChange={setShowOvertimeModal}
        />
      </div>
    </Layout>
  );
};

export default HumanResources;
