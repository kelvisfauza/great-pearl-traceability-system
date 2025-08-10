import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Shield } from 'lucide-react';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';

const AssignedRoleNotification = () => {
  const roleData = useRoleBasedData();

  if (!roleData?.isAssignedApprover && !roleData?.isAssignedAdminDelegate) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3">
        {roleData.isAssignedAdminDelegate ? (
          <Crown className="h-5 w-5 text-amber-600" />
        ) : (
          <Shield className="h-5 w-5 text-blue-600" />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              Special Role Assigned
            </span>
            <Badge 
              variant={roleData.isAssignedAdminDelegate ? "default" : "secondary"}
              className={roleData.isAssignedAdminDelegate ? "bg-amber-500" : "bg-blue-500"}
            >
              {roleData.isAssignedAdminDelegate ? 'Admin Delegate' : 'Approver'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {roleData.isAssignedAdminDelegate 
              ? "You have been granted full administrative privileges to make approvals on behalf of the admin."
              : "You have been authorized to approve requests. Check the approval section below."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssignedRoleNotification;