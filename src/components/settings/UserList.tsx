
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Employee } from "@/hooks/useEmployees";

interface UserListProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export default function UserList({ employees, onEdit, onDelete }: UserListProps) {
  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{employee.name}</p>
                <p className="text-sm text-gray-500">{employee.email}</p>
                <p className="text-xs text-gray-400">{employee.position} • {employee.department}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{employee.role}</Badge>
            <Badge variant={employee.status === "active" ? "default" : "secondary"}>
              {employee.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(employee)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(employee)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
