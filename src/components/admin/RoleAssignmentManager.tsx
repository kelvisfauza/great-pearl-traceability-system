import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Crown, Shield, X } from 'lucide-react';
import { useRoleAssignment } from '@/hooks/useRoleAssignment';
import RoleAssignmentModal from './RoleAssignmentModal';

const RoleAssignmentManager = () => {
  const [showModal, setShowModal] = useState(false);
  const { assignments, revokeRole, loading } = useRoleAssignment();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin_delegate':
        return <Crown className="h-4 w-4" />;
      case 'approver':
        return <Shield className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin_delegate':
        return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'approver':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Role Assignment Management
            </CardTitle>
            <Button onClick={() => setShowModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No role assignments found
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full text-white ${getRoleColor(assignment.role)}`}>
                      {getRoleIcon(assignment.role)}
                    </div>
                    <div>
                      <div className="font-medium">{assignment.assignedToName}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.assignedToEmail}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.description}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {assignment.role === 'admin_delegate' ? 'Admin Delegate' : 'Approver'}
                        </Badge>
                        {assignment.expiresAt && (
                          <Badge variant="outline">
                            Expires: {new Date(assignment.expiresAt).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => revokeRole(assignment.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoleAssignmentModal 
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default RoleAssignmentManager;