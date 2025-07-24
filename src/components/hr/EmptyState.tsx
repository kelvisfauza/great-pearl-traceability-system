
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, FileText, TrendingUp, Search, DollarSign } from "lucide-react";

interface EmptyStateProps {
  searchTerm?: string;
  hasEmployees?: boolean;
  onAddEmployee?: () => void;
  onResetFilters?: () => void;
  type?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const EmptyState = ({ 
  searchTerm, 
  hasEmployees, 
  onAddEmployee, 
  onResetFilters, 
  type, 
  onAction, 
  actionLabel 
}: EmptyStateProps) => {
  // Handle payment history empty state
  if (type === 'payments') {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="bg-gray-50 rounded-full p-4 mb-4">
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
            No Payment History
          </CardTitle>
          <CardDescription className="text-gray-500 mb-6 max-w-sm">
            No payroll payments have been processed yet. Start by processing your first payroll.
          </CardDescription>
          {onAction && actionLabel && (
            <Button onClick={onAction} className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>{actionLabel}</span>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Handle employee search empty state
  const isSearching = searchTerm && searchTerm.trim().length > 0;

  if (isSearching) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="bg-gray-50 rounded-full p-4 mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
            No employees found
          </CardTitle>
          <CardDescription className="text-gray-500 mb-6 max-w-sm">
            No employees match your search criteria. Try adjusting your search terms or filters.
          </CardDescription>
          {onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Handle no employees empty state
  if (!hasEmployees) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="bg-gray-50 rounded-full p-4 mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
            No Employees Yet
          </CardTitle>
          <CardDescription className="text-gray-500 mb-6 max-w-sm">
            Start building your team by adding your first employee.
          </CardDescription>
          {onAddEmployee && (
            <Button onClick={onAddEmployee} className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Add First Employee</span>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default EmptyState;
