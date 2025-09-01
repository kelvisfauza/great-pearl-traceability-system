import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { CompanyEmployee } from '@/hooks/useCompanyEmployees';

interface CompanyEmployeesListProps {
  employees: CompanyEmployee[];
  onAddEmployee: () => void;
  onEditEmployee: (employee: CompanyEmployee) => void;
  onDeleteEmployee: (id: string) => void;
  loading: boolean;
}

const CompanyEmployeesList = ({
  employees,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  loading
}: CompanyEmployeesListProps) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (deleteConfirm === id) {
      onDeleteEmployee(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Company Employees Directory</CardTitle>
          <Button onClick={onAddEmployee}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No company employees found</p>
            <Button onClick={onAddEmployee} className="mt-4">
              <UserPlus className="h-4 w-4 mr-2" />
              Add First Employee
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.employee_id}
                    </TableCell>
                    <TableCell>{employee.full_name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.phone || 'N/A'}</TableCell>
                    <TableCell>UGX {employee.base_salary.toLocaleString()}</TableCell>
                    <TableCell>UGX {employee.allowances.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(employee.hire_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditEmployee(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={deleteConfirm === employee.id ? 'destructive' : 'outline'}
                          onClick={() => handleDelete(employee.id, employee.full_name)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteConfirm === employee.id ? 'Confirm' : ''}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyEmployeesList;