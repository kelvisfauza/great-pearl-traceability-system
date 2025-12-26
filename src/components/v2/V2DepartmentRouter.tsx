import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Department to V2 route mapping
const DEPARTMENT_ROUTES: Record<string, string> = {
  'Store': '/v2/store',
  'Quality Control': '/v2/quality',
  'Quality': '/v2/quality',
  'Sales': '/v2/sales',
  'Sales & Marketing': '/v2/sales',
  'Finance': '/v2/finance',
  'Human Resources': '/v2/hr',
  'HR': '/v2/hr',
  'Field Operations': '/v2/field-operations',
  'Field': '/v2/field-operations',
  'Data Analysis': '/v2/analytics',
  'Analytics': '/v2/analytics',
  'EUDR Documentation': '/v2/eudr',
  'EUDR': '/v2/eudr',
  'Administration': '/v2/admin',
  'Admin': '/v2/admin',
  'IT': '/v2/it',
  'IT Department': '/v2/it',
  'Logistics': '/v2/logistics',
  'Processing': '/v2/processing',
  'Milling': '/v2/milling',
  'Inventory': '/v2/inventory',
  'Procurement': '/v2/procurement',
};

// Departments that have V2 dashboards
const SUPPORTED_DEPARTMENTS = [
  'Store',
  'Quality Control',
  'Quality',
  'Sales',
  'Sales & Marketing',
  'Finance',
  'Human Resources',
  'HR',
  'Field Operations',
  'Field',
  'Data Analysis',
  'Analytics',
  'EUDR Documentation',
  'EUDR',
  'Administration',
  'Admin',
  'IT',
  'IT Department',
  'Logistics',
  'Processing',
  'Milling',
  'Inventory',
  'Procurement',
];

const V2DepartmentRouter = () => {
  const { employee, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!employee) return;

    // Admins go to admin dashboard
    if (isAdmin()) {
      navigate('/v2/admin', { replace: true });
      return;
    }

    const department = employee.department;
    const route = DEPARTMENT_ROUTES[department];

    if (route) {
      navigate(route, { replace: true });
    }
  }, [employee, isAdmin, navigate]);

  // Loading state
  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if department is supported
  const department = employee.department;
  const isSupported = SUPPORTED_DEPARTMENTS.some(
    d => d.toLowerCase() === department?.toLowerCase()
  );

  // Access denied for unsupported departments
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">V2 Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The V2 system is not yet available for the <strong>{department}</strong> department.
            </p>
            <p className="text-sm text-muted-foreground">
              Please continue using the V1 system for your daily operations.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to V1 Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">
          Redirecting to {department} Dashboard...
        </p>
      </div>
    </div>
  );
};

export default V2DepartmentRouter;
