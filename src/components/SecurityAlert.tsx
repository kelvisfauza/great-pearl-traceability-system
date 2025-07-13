
import { AlertTriangle, Shield, Lock, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const SecurityAlert = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Shield className="h-5 w-5" />
          Security Status
        </CardTitle>
        <CardDescription className="text-amber-700">
          System security monitoring and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <Lock className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Secure Authentication</p>
              <p className="text-xs text-green-600">Row-level security enabled</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Eye className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-800">Audit Logging</p>
              <p className="text-xs text-blue-600">Security events tracked</p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Monitoring
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <Shield className="h-5 w-5 text-purple-600" />
            <div>
              <p className="font-medium text-purple-800">Access Control</p>
              <p className="text-xs text-purple-600">Role-based permissions</p>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Protected
            </Badge>
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-sm text-gray-700">
            <strong>Security Enhancements Applied:</strong>
          </p>
          <ul className="text-xs text-gray-600 mt-2 space-y-1">
            <li>• Enhanced password requirements with complexity validation</li>
            <li>• Secure RLS policies preventing unauthorized data access</li>
            <li>• Privilege escalation protection for role assignments</li>
            <li>• Comprehensive security audit logging</li>
            <li>• User-employee profile linking with automatic creation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityAlert;
