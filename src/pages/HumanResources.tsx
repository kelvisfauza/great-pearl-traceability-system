
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, DollarSign, Clock, TrendingUp, Send, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useSecureEmployees } from '@/hooks/useSecureEmployees';
import { useSalaryPayments } from '@/hooks/useSalaryPayments';
import AddEmployeeModal from '@/components/hr/AddEmployeeModal';
import SalaryPaymentModal from '@/components/hr/SalaryPaymentModal';
import EmployeeDetailsModal from '@/components/hr/EmployeeDetailsModal';
import RegistrationRequestsManager from '@/components/hr/RegistrationRequestsManager';

const HumanResources = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useSecureEmployees();
  const { paymentRequests, submitPaymentRequest } = useSalaryPayments();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const handleAddEmployee = async (employeeData: any) => {
    try {
      console.log('HR: Adding new employee:', employeeData);
      await addEmployee(employeeData);
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('HR: Error adding employee:', error);
    }
  };

  const handleEmployeeUpdated = async (updatedEmployee: any) => {
    try {
      console.log('HR: Updating employee:', updatedEmployee);
      await updateEmployee(updatedEmployee.id, updatedEmployee);
    } catch (error) {
      console.error('HR: Error updating employee:', error);
    }
  };

  const handleSalaryPaymentRequest = async (requestData: any) => {
    try {
      console.log('HR: Submitting salary payment request:', requestData);
      await submitPaymentRequest(requestData);
      setIsSalaryModalOpen(false);
    } catch (error) {
      console.error('HR: Error submitting salary payment request:', error);
    }
  };

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'Active').length,
    pendingRequests: paymentRequests.filter(r => r.status === 'Pending').length,
    avgSalary: employees.length > 0 ? Math.round(employees.reduce((sum, e) => sum + e.salary, 0) / employees.length) : 0
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Human Resources</h1>
            <p className="text-muted-foreground">Manage employees, payroll, and HR operations</p>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={() => setIsSalaryModalOpen(true)} variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Submit Salary Request
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeEmployees} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">UGX {stats.avgSalary.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Monthly average
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingRequests}</div>
              <p className="text-xs text-muted-foreground">
                Salary payment requests
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Department Count</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(employees.map(e => e.department)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Active departments
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="registration" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registration">Registration Requests</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>
          
          <TabsContent value="registration" className="space-y-4">
            <RegistrationRequestsManager />
          </TabsContent>
          
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Directory</CardTitle>
                <CardDescription>
                  Manage employee information and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading employees...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.role}</Badge>
                          </TableCell>
                          <TableCell>UGX {employee.salary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setIsDetailsModalOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payroll" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Salary Payment Requests</CardTitle>
                <CardDescription>
                  Review and process salary payment requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.id.slice(0, 8)}</TableCell>
                        <TableCell>{request.title}</TableCell>
                        <TableCell>{request.amount}</TableCell>
                        <TableCell>{request.requestedby}</TableCell>
                        <TableCell>{new Date(request.daterequested).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'Approved' ? 'default' : 
                            request.status === 'Rejected' ? 'destructive' : 'secondary'
                          }>
                            {request.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddEmployeeModal
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onEmployeeAdded={handleAddEmployee}
        />

        <SalaryPaymentModal
          open={isSalaryModalOpen}
          onOpenChange={setIsSalaryModalOpen}
          employees={employees}
          onPaymentRequestSubmitted={handleSalaryPaymentRequest}
        />

        {selectedEmployee && (
          <EmployeeDetailsModal
            open={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            employee={selectedEmployee}
            onEmployeeUpdated={handleEmployeeUpdated}
          />
        )}
      </div>
    </Layout>
  );
};

export default HumanResources;
