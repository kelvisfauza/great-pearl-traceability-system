
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, DollarSign, Calendar, Plus, Search, Eye, CreditCard, UserCog, FileText, TrendingUp, Loader2 } from "lucide-react";
import { useState } from "react";
import AddEmployeeModal from "@/components/hr/AddEmployeeModal";
import SalaryPaymentModal from "@/components/hr/SalaryPaymentModal";
import EmployeeDetailsModal from "@/components/hr/EmployeeDetailsModal";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import { useSalaryPayments } from "@/hooks/useSalaryPayments";

const HumanResources = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showSalaryPayment, setShowSalaryPayment] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { toast } = useToast();

  const { employees, loading: employeesLoading, addEmployee, updateEmployee } = useEmployees();
  const { payments, addPayment } = useSalaryPayments();

  const departments = [
    { name: "Operations", employees: employees.filter(e => e.department === "Operations").length, avgSalary: "UGX 2,450,000", budget: "UGX 19,600,000" },
    { name: "Quality Control", employees: employees.filter(e => e.department === "Quality Control").length, avgSalary: "UGX 2,100,000", budget: "UGX 10,500,000" },
    { name: "Production", employees: employees.filter(e => e.department === "Production").length, avgSalary: "UGX 1,850,000", budget: "UGX 22,200,000" },
    { name: "Administration", employees: employees.filter(e => e.department === "Administration").length, avgSalary: "UGX 2,800,000", budget: "UGX 11,200,000" },
  ];

  const upcomingEvents = [
    { id: 1, title: "Annual Performance Reviews", date: "Jan 15-30, 2025", type: "Review", participants: "All Staff" },
    { id: 2, title: "Safety Training Workshop", date: "Jan 20, 2025", type: "Training", participants: "Production Team" },
    { id: 3, title: "New Employee Orientation", date: "Jan 25, 2025", type: "Orientation", participants: "New Hires" },
  ];

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddEmployee = async (newEmployeeData: any) => {
    try {
      await addEmployee(newEmployeeData);
      setShowAddEmployee(false);
    } catch (error) {
      console.error('Failed to add employee:', error);
    }
  };

  const handleEmployeeUpdate = async (updatedEmployee: any) => {
    try {
      await updateEmployee(updatedEmployee.id, updatedEmployee);
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const handlePaymentProcessed = async (paymentData: any) => {
    try {
      await addPayment(paymentData);
      setShowSalaryPayment(false);
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetails(true);
  };

  const generatePayslips = () => {
    toast({
      title: "Success",
      description: "Payslips generated and sent to employees"
    });
  };

  const activeEmployees = employees.filter(e => e.status === "Active");
  const totalMonthlyPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0);

  if (employeesLoading) {
    return (
      <Layout title="Human Resources" subtitle="Manage staff, payroll, and organizational structure">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Human Resources" 
      subtitle="Manage staff, payroll, and organizational structure"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-xs text-green-600">
                    {employees.filter(e => new Date(e.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length} new hires this month
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present Today</p>
                  <p className="text-2xl font-bold">{activeEmployees.length}</p>
                  <p className="text-xs text-blue-600">{((activeEmployees.length / employees.length) * 100).toFixed(1)}% active</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                  <p className="text-2xl font-bold">UGX {(totalMonthlyPayroll / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-purple-600">Total across all employees</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Processed Payments</p>
                  <p className="text-2xl font-bold">{payments.length}</p>
                  <p className="text-xs text-amber-600">This year</p>
                </div>
                <Calendar className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common HR tasks and operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button onClick={() => setShowAddEmployee(true)} className="h-16 flex-col">
                <UserCog className="h-6 w-6 mb-2" />
                Add Employee
              </Button>
              <Button onClick={() => setShowSalaryPayment(true)} variant="outline" className="h-16 flex-col">
                <CreditCard className="h-6 w-6 mb-2" />
                Process Payroll
              </Button>
              <Button onClick={generatePayslips} variant="outline" className="h-16 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                Generate Payslips
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <TrendingUp className="h-6 w-6 mb-2" />
                HR Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Directory</CardTitle>
                  <CardDescription>Manage staff information and records</CardDescription>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-gray-500">{employee.position}</p>
                      <p className="text-xs text-gray-400">
                        {employee.department} • Joined {new Date(employee.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleViewEmployee(employee)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Department Overview</CardTitle>
              <CardDescription>Staff distribution and budget allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{dept.name}</h4>
                      <Badge variant="outline">{dept.employees} staff</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>Avg Salary: {dept.avgSalary}</p>
                      </div>
                      <div>
                        <p>Budget: {dept.budget}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payroll History */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Recent payroll processing records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{payment.month}</h4>
                      <Badge variant={payment.status === "Processed" ? "default" : "outline"}>
                        {payment.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>Total Pay: UGX {payment.total_pay.toLocaleString()}</p>
                        <p>Employees: {payment.employee_count}</p>
                      </div>
                      <div>
                        <p>Bonuses: UGX {payment.bonuses.toLocaleString()}</p>
                        <p>Method: {payment.payment_method}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming HR Events</CardTitle>
              <CardDescription>Scheduled activities and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge variant="outline">{event.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{event.date}</p>
                    <p className="text-xs text-gray-500">Participants: {event.participants}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddEmployeeModal
        open={showAddEmployee}
        onOpenChange={setShowAddEmployee}
        onEmployeeAdded={handleAddEmployee}
      />
      
      <SalaryPaymentModal
        open={showSalaryPayment}
        onOpenChange={setShowSalaryPayment}
        employees={activeEmployees}
        onPaymentProcessed={handlePaymentProcessed}
      />
      
      <EmployeeDetailsModal
        open={showEmployeeDetails}
        onOpenChange={setShowEmployeeDetails}
        employee={selectedEmployee}
        onEmployeeUpdated={handleEmployeeUpdate}
      />
    </Layout>
  );
};

export default HumanResources;
