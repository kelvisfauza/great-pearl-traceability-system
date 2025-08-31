import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
import UserPermissionsList from '@/components/admin/UserPermissionsList';

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
      <UserPermissionsList />
    </div>
  );
};

export default RoleManagement;