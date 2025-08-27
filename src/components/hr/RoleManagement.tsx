import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import UnifiedPermissionManager from '@/components/admin/UnifiedPermissionManager';

const RoleManagement = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">Only administrators can manage roles and permissions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Permission management has been unified. Use the Admin Dashboard → User Permissions for comprehensive management.
        </p>
      </div>
      <UnifiedPermissionManager />
    </div>
  );
};

export default RoleManagement;