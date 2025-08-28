import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from './useNotifications';

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
  const { createRoleAssignmentNotification } = useNotifications();

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const assignmentsQuery = query(collection(db, 'role_assignments'));
      const querySnapshot = await getDocs(assignmentsQuery);
      
      const assignmentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RoleAssignment[];
      
      setAssignments(assignmentsData.filter(a => a.isActive));
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch role assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      const assignmentData = {
        assignedToId,
        assignedToName,
        assignedToEmail,
        assignedById: employee?.id || '',
        assignedByName: employee?.name || '',
        role,
        description,
        createdAt: new Date().toISOString(),
        expiresAt,
        isActive: true
      };

      await addDoc(collection(db, 'role_assignments'), assignmentData);
      
      // Also update the employee's actual permissions properly
      try {
        const { updateEmployeePermissions } = await import('@/utils/updateEmployeePermissions');
        
        // Get role-specific permissions and merge with existing permissions
        const rolePermissions = role === 'admin_delegate' 
          ? ['Administration', 'Finance', 'Human Resources', 'Operations', 'Reports', 'Store Management']
          : ['Reports', 'Store Management']; // Basic approver permissions
        
        await updateEmployeePermissions(assignedToEmail, {
          permissions: rolePermissions
        });
        
        console.log(`✅ Updated ${assignedToEmail} permissions for ${role} role:`, rolePermissions);
      } catch (permError) {
        console.warn('Failed to update employee permissions:', permError);
      }
      
      // Create notification for the assigned user
      await createRoleAssignmentNotification(
        assignedToName,
        role === 'admin_delegate' ? 'Admin Delegate' : 'Approver',
        role === 'admin_delegate' ? ['Full administrative privileges', 'All department access'] : ['Approval permissions'],
        employee?.name || 'Administrator'
      );
      
      toast({
        title: "Role Assigned",
        description: `${role} role assigned to ${assignedToName}`
      });

      await fetchAssignments();
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

    try {
      await deleteDoc(doc(db, 'role_assignments', assignmentId));
      
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      
      toast({
        title: "Role Revoked",
        description: "Role assignment has been revoked"
      });

      return true;
    } catch (error) {
      console.error('Error revoking role:', error);
      toast({
        title: "Error",
        description: "Failed to revoke role",
        variant: "destructive"
      });
      return false;
    }
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