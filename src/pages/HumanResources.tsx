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
  DollarSign,
  Calendar,
  Building,
  Mail,
  Phone
} from "lucide-react";
import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";
import AddEmployeeModal from "@/components/hr/AddEmployeeModal";
import EmployeeDetailsModal from "@/components/hr/EmployeeDetailsModal";
import SalaryPaymentModal from "@/components/hr/SalaryPaymentModal";
import EmptyState from "@/components/hr/EmptyState";
import EmployeeStatsCards from "@/components/hr/EmployeeStatsCards";
import EmployeeFilters from "@/components/hr/EmployeeFilters";
import EmployeeList from "@/components/hr/EmployeeList";
import PaymentHistory from "@/components/hr/PaymentHistory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HumanResources = () => {
  const { employees, loading: employeesLoading, deleteEmployee, addEmployee, updateEmployee } = useEmployees();
  const { paymentRequests, loading: paymentsLoading, submitPaymentRequest } = useSalaryPayments();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Filter employees based on search, department, and status
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === "All" || emp.department === selectedDepartment;
    const matchesStatus = selectedStatus === "All" || emp.status === selectedStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Get unique departments and statuses
  const departments = ["All", ...new Set(employees.map(emp => emp.department))];
  const statuses = ["All", ...new Set(employees.map(emp => emp.status))];

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDetailsModalOpen(true);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      await deleteEmployee(employeeId);
    }
  };

  const handleAddEmployee = async (employeeData: any) => {
    await addEmployee(employeeData);
    setIsAddModalOpen(false);
  };

  const handleUpdateEmployee = async (employeeData: any) => {
    if (employeeData.id) {
      const { id, ...updates } = employeeData;
      await updateEmployee(id, updates);
    }
  };

  const handleSubmitPaymentRequest = async (requestData: any) => {
    await submitPaymentRequest(requestData);
    setIsPaymentModalOpen(false);
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
        <EmployeeStatsCards employees={employees} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Management */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Employee Directory
                  </CardTitle>
                  <CardDescription>Manage your workforce</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => setIsPaymentModalOpen(true)} variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Salary Payment
                  </Button>
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Enhanced Search and Filters */}
              <EmployeeFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedDepartment={selectedDepartment}
                onDepartmentChange={setSelectedDepartment}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                departments={departments}
                statuses={statuses}
              />

              {/* Employee List */}
              {filteredEmployees.length > 0 ? (
                <EmployeeList
                  employees={filteredEmployees}
                  onViewEmployee={handleViewEmployee}
                  onEditEmployee={handleEditEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              ) : employees.length > 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No employees match your filters</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedDepartment("All");
                      setSelectedStatus("All");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <EmptyState 
                  type="employees"
                  onAction={() => setIsAddModalOpen(true)}
                  actionLabel="Add First Employee"
                />
              )}
            </CardContent>
          </Card>

          {/* Payment Request History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Requests
                  </CardTitle>
                  <CardDescription>Salary payment request status</CardDescription>
                </div>
                <Button onClick={() => setIsPaymentModalOpen(true)} size="sm">
                  New Request
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <p className="text-center text-gray-500">Loading requests...</p>
              ) : paymentRequests.length > 0 ? (
                <div className="space-y-3">
                  {paymentRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{request.title}</p>
                          <p className="text-sm text-gray-600">{request.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(request.daterequested).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant={
                          request.status === 'Approved' ? 'default' : 
                          request.status === 'Rejected' ? 'destructive' : 'secondary'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {request.amount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.details?.employee_count || 0} employees
                        </p>
                      </div>
                      
                      {request.status === 'Approved' && (
                        <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-400">
                          <p className="text-xs text-green-800">
                            Approved - Finance will process payment
                          </p>
                        </div>
                      )}
                      
                      {request.status === 'Rejected' && (
                        <div className="mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400">
                          <p className="text-xs text-red-800">
                            Request rejected - Contact Finance for details
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No payment requests</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    Submit First Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddEmployeeModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen}
        onEmployeeAdded={handleAddEmployee}
      />
      
      <EmployeeDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        employee={selectedEmployee}
        onEmployeeUpdated={handleUpdateEmployee}
      />
      
      <SalaryPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        employees={employees}
        onPaymentRequestSubmitted={handleSubmitPaymentRequest}
      />
    </Layout>
  );
};

export default HumanResources;
