import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, UserCheck, DollarSign, Calendar, Plus, Search, Eye, CreditCard, UserCog, FileText, TrendingUp } from "lucide-react";
import { useState } from "react";
import AddEmployeeModal from "@/components/hr/AddEmployeeModal";
import SalaryPaymentModal from "@/components/hr/SalaryPaymentModal";
import EmployeeDetailsModal from "@/components/hr/EmployeeDetailsModal";
import { useToast } from "@/hooks/use-toast";

const HumanResources = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showSalaryPayment, setShowSalaryPayment] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const { toast } = useToast();

  const [employees, setEmployees] = useState([
    { id: 1, name: "John Mbale", position: "Operations Manager", department: "Operations", salary: "UGX 3,500,000", status: "Active", joinDate: "Jan 2020", email: "john@greatpearl.com", role: "Manager", permissions: ["Operations", "Reports"] },
    { id: 2, name: "Sarah Nakato", position: "Quality Control Supervisor", department: "Quality Control", salary: "UGX 2,800,000", status: "Active", joinDate: "Mar 2021", email: "sarah@greatpearl.com", role: "Supervisor", permissions: ["Quality Control"] },
    { id: 3, name: "Peter Asiimwe", position: "Finance Officer", department: "Finance", salary: "UGX 2,500,000", status: "Active", joinDate: "Aug 2019", email: "peter@greatpearl.com", role: "User", permissions: ["Finance"] },
    { id: 4, name: "Mary Nalubega", position: "HR Coordinator", department: "HR", salary: "UGX 2,200,000", status: "On Leave", joinDate: "Feb 2022", email: "mary@greatpearl.com", role: "User", permissions: ["Human Resources"] },
    { id: 5, name: "David Tumwine", position: "Production Supervisor", department: "Production", salary: "UGX 2,600,000", status: "Active", joinDate: "Nov 2020", email: "david@greatpearl.com", role: "Supervisor", permissions: ["Production"] },
  ]);

  const [payrollHistory, setPayrollHistory] = useState([
    { id: 1, month: "December 2024", totalPay: "UGX 45,600,000", employees: 28, bonuses: "UGX 8,200,000", status: "Processed" },
    { id: 2, month: "November 2024", totalPay: "UGX 43,200,000", employees: 27, bonuses: "UGX 5,100,000", status: "Completed" },
    { id: 3, month: "October 2024", totalPay: "UGX 44,800,000", employees: 28, bonuses: "UGX 6,700,000", status: "Completed" },
  ]);

  const departments = [
    { name: "Operations", employees: 8, avgSalary: "UGX 2,450,000", budget: "UGX 19,600,000" },
    { name: "Quality Control", employees: 5, avgSalary: "UGX 2,100,000", budget: "UGX 10,500,000" },
    { name: "Production", employees: 12, avgSalary: "UGX 1,850,000", budget: "UGX 22,200,000" },
    { name: "Administration", employees: 4, avgSalary: "UGX 2,800,000", budget: "UGX 11,200,000" },
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

  const handleAddEmployee = (newEmployee: any) => {
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleEmployeeUpdate = (updatedEmployee: any) => {
    setEmployees(prev => 
      prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
    );
  };

  const handlePaymentProcessed = (payment: any) => {
    setPayrollHistory(prev => [payment, ...prev]);
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
                  <p className="text-xs text-green-600">2 new hires this month</p>
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
                  <p className="text-2xl font-bold">{employees.filter(e => e.status === "Active").length}</p>
                  <p className="text-xs text-blue-600">89.7% attendance</p>
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
                  <p className="text-2xl font-bold">UGX 45.6M</p>
                  <p className="text-xs text-purple-600">+5.5% from last month</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-xs text-amber-600">Due this week</p>
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
                      <p className="text-xs text-gray-400">{employee.department} • Joined {employee.joinDate}</p>
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
                {payrollHistory.map((payroll) => (
                  <div key={payroll.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{payroll.month}</h4>
                      <Badge variant={payroll.status === "Processed" ? "default" : "outline"}>
                        {payroll.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p>Total Pay: {payroll.totalPay}</p>
                        <p>Employees: {payroll.employees}</p>
                      </div>
                      <div>
                        <p>Bonuses: {payroll.bonuses}</p>
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
        employees={employees.filter(e => e.status === "Active")}
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
