
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface EmployeeFiltersProps {
  departmentFilter: string;
  roleFilter: string;
  statusFilter: string;
  onDepartmentChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

const EmployeeFilters = ({
  departmentFilter,
  roleFilter,
  statusFilter,
  onDepartmentChange,
  onRoleChange,
  onStatusChange,
  onReset
}: EmployeeFiltersProps) => {
  const departments = ["all", "Operations", "Quality Control", "Production", "Administration", "Finance", "Sales & Marketing", "HR"];
  const roles = ["all", "Administrator", "Manager", "Supervisor", "User", "Guest"];
  const statuses = ["all", "Active", "On Leave", "Inactive", "Terminated"];

  return (
    <div className="flex items-center gap-2">
      <Select value={departmentFilter} onValueChange={onDepartmentChange}>
        <SelectTrigger className="w-40">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          {departments.map(dept => (
            <SelectItem key={dept} value={dept}>
              {dept === "all" ? "All Departments" : dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={roleFilter} onValueChange={onRoleChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map(role => (
            <SelectItem key={role} value={role}>
              {role === "all" ? "All Roles" : role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map(status => (
            <SelectItem key={status} value={status}>
              {status === "all" ? "All Statuses" : status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onReset}>
        <X className="h-4 w-4" />
        Reset
      </Button>
    </div>
  );
};

export default EmployeeFilters;
