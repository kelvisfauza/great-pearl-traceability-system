
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  DollarSign
} from "lucide-react";
import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import AddEmployeeModal from "@/components/hr/AddEmployeeModal";
import EmployeeDetailsModal from "@/components/hr/EmployeeDetailsModal";
import SalaryPaymentModal from "@/components/hr/SalaryPaymentModal";
import EmptyState from "@/components/hr/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HumanResources = () => {
  const { employees, loading: employeesLoading, deleteEmployee } = useEmployees();
  const { payments, loading: paymentsLoading } = useSalaryPayments();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Filter employees based on search and department
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "All" || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = ["All", ...new Set(employees.map(emp => emp.department))];

  // Calculate statistics
  const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
  const totalSalary = employees.reduce((sum, emp) => sum + Number(emp.salary), 0);
  const avgSalary = employees.length > 0 ? totalSalary / employees.length : 0;

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await deleteEmployee(employeeId);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'destructive';
      case 'Manager':
        return 'default';
      case 'Supervisor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (employeesLoading) {
    return (
      <Layout title="Human Resources" subtitle="Manage employees and payroll">
        <div className="space-y-6">
          <div className="text-center py-8">
            <p>Loading employees...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Human Resources" subtitle="Manage employees and payroll">
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold">{activeEmployees}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                  <p className="text-2xl font-bold">UGX {(totalSalary / 1000000).toFixed(1)}M</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Salary</p>
                  <p className="text-2xl font-bold">UGX {(avgSalary / 1000).toFixed(0)}K</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Directory</CardTitle>
                  <CardDescription>Manage your workforce</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => setIsPaymentModalOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Salary
                  </Button>
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex space-x-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Employee List */}
              {filteredEmployees.length > 0 ? (
                <div className="space-y-4">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {employee.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-500">{employee.position}</p>
                          <p className="text-xs text-gray-400">{employee.department}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge variant={getRoleColor(employee.role)}>
                          {employee.role}
                        </Badge>
                        <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          UGX {(Number(employee.salary) / 1000).toFixed(0)}K
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteEmployee(employee.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Salary Payments</CardTitle>
              <CardDescription>Latest payroll transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <p className="text-center text-gray-500">Loading payments...</p>
              ) : payments.length > 0 ? (
                <div className="space-y-4">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{payment.month}</span>
                        <Badge variant={payment.status === 'Processed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        UGX {(Number(payment.total_pay) / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-xs text-gray-400">
                        {payment.employee_count} employees
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No payments recorded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      <EmployeeDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        employee={selectedEmployee}
      />
      
      <SalaryPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </Layout>
  );
};

export default HumanResources;
