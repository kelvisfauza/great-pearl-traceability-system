
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash2, Mail, Phone, Building, Calendar, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Employee } from '@/hooks/useFirebaseEmployees';
import DeletionRequestModal from './DeletionRequestModal';

interface EmployeeListProps {
  employees: any[];
  onViewEmployee: (employee: any) => void;
  onEditEmployee: (employee: any) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onPrintCredentials: (employee: any) => void;
}

const EmployeeList = ({ employees, onViewEmployee, onEditEmployee, onDeleteEmployee, onPrintCredentials }: EmployeeListProps) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const { hasRole } = useAuth();
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

  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                  <Badge variant={getRoleColor(employee.role)} className="text-xs">
                    {employee.role}
                  </Badge>
                  <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                    {employee.status}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{employee.position} • {employee.department}</span>
                  </div>
                  
                  {employee.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{employee.email}</span>
                    </div>
                  )}
                  
                  {employee.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {format(new Date(employee.join_date), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  UGX {(Number(employee.salary) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-gray-500">monthly</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewEmployee(employee)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Employee
                  </DropdownMenuItem>
                  {employee.authUserId && (
                    <DropdownMenuItem onClick={() => onPrintCredentials(employee)}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Login Credentials
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      if (hasRole('Administrator')) {
                        onDeleteEmployee(employee.id);
                      } else {
                        setSelectedEmployee(employee);
                        setShowDeletionModal(true);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {hasRole('Administrator') ? 'Delete' : 'Request Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      ))}
      
      {selectedEmployee && (
        <DeletionRequestModal
          open={showDeletionModal}
          onClose={() => {
            setShowDeletionModal(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
};

export default EmployeeList;
