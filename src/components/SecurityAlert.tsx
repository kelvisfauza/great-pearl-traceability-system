
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityAlertProps {
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  showRoleInfo?: boolean;
}

const SecurityAlert: React.FC<SecurityAlertProps> = ({ 
  type, 
  title, 
  message, 
  showRoleInfo = false 
}) => {
  const { employee } = useAuth();

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <Alert variant={getVariant()} className="mb-4">
      {getIcon()}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message}
        {showRoleInfo && employee && (
          <div className="mt-2 text-xs opacity-75">
            Role: {employee.role} | Department: {employee.department}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SecurityAlert;
