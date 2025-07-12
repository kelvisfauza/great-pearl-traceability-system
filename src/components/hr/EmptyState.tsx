
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, FileText, TrendingUp } from "lucide-react";

interface EmptyStateProps {
  type: "employees" | "payments" | "departments";
  onAction?: () => void;
  actionLabel?: string;
}

const EmptyState = ({ type, onAction, actionLabel }: EmptyStateProps) => {
  const getEmptyStateContent = () => {
    switch (type) {
      case "employees":
        return {
          icon: Users,
          title: "No Employees Yet",
          description: "Start building your team by adding your first employee.",
          actionIcon: UserPlus,
          defaultActionLabel: "Add First Employee"
        };
      case "payments":
        return {
          icon: FileText,
          title: "No Payroll History",
          description: "Process your first payroll to see payment records here.",
          actionIcon: TrendingUp,
          defaultActionLabel: "Process Payroll"
        };
      case "departments":
        return {
          icon: Users,
          title: "No Departments",
          description: "Add employees to see department breakdowns.",
          actionIcon: UserPlus,
          defaultActionLabel: "Add Employee"
        };
      default:
        return {
          icon: Users,
          title: "No Data",
          description: "Get started by adding some data.",
          actionIcon: UserPlus,
          defaultActionLabel: "Get Started"
        };
    }
  };

  const { icon: Icon, title, description, actionIcon: ActionIcon, defaultActionLabel } = getEmptyStateContent();

  return (
    <Card className="border-dashed border-2 border-gray-200">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="bg-gray-50 rounded-full p-4 mb-4">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <CardTitle className="text-lg font-semibold text-gray-900 mb-2">{title}</CardTitle>
        <CardDescription className="text-gray-500 mb-6 max-w-sm">
          {description}
        </CardDescription>
        {onAction && (
          <Button onClick={onAction} className="flex items-center space-x-2">
            <ActionIcon className="h-4 w-4" />
            <span>{actionLabel || defaultActionLabel}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
