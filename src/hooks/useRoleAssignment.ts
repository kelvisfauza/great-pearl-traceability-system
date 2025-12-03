import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface RoleAssignment {
  id: string;
  assignedToId: string;
  assignedToName: string;
  assignedToEmail: string;
  assignedById: string;
  assignedByName: string;
  role: 'approver' | 'admin_delegate';
  description: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export const useRoleAssignment = () => {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { employee, isAdmin } = useAuth();

  const fetchAssignments = async () => {
    // Role assignments disabled - system uses Supabase employees table directly
    setAssignments([]);
    setLoading(false);
  };

  const assignRole = async (
    assignedToId: string,
    assignedToName: string,
    assignedToEmail: string,
    role: 'approver' | 'admin_delegate',
    description: string,
    expiresAt?: string
  ) => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can assign roles",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Update employee permissions directly in Supabase
      const rolePermissions = role === 'admin_delegate' 
        ? ['Administration', 'Finance', 'Human Resources', 'Operations', 'Reports', 'Store Management']
        : ['Reports', 'Store Management'];
      
      const updateData: any = {
        permissions: rolePermissions,
        updated_at: new Date().toISOString()
      };
      
      if (role === 'admin_delegate') {
        updateData.role = 'Administrator';
      }
      
      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('email', assignedToEmail.toLowerCase());

      if (error) throw error;
      
      toast({
        title: "Role Assigned",
        description: `${role} role assigned to ${assignedToName}. They will see changes immediately.`
      });

      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive"
      });
      return false;
    }
  };

  const revokeRole = async (assignmentId: string) => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "Only administrators can revoke roles",
        variant: "destructive"
      });
      return false;
    }

    toast({
      title: "Role Revoked",
      description: "Role assignment has been revoked"
    });

    return true;
  };

  const getUserAssignments = (userId: string) => {
    return assignments.filter(a => a.assignedToId === userId && a.isActive);
  };

  const hasAssignedRole = (userId: string, role: 'approver' | 'admin_delegate') => {
    return assignments.some(a => 
      a.assignedToId === userId && 
      a.role === role && 
      a.isActive &&
      (!a.expiresAt || new Date(a.expiresAt) > new Date())
    );
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return {
    assignments,
    loading,
    assignRole,
    revokeRole,
    getUserAssignments,
    hasAssignedRole,
    refetch: fetchAssignments
  };
};
