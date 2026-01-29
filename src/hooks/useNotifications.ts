import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'approval_request' | 'system' | 'announcement' | 'reminder';
  title: string;
  message: string;
  amount?: number;
  department: string;
  requestedBy?: string;
  senderName?: string;
  senderDepartment?: string;
  priority: 'High' | 'Medium' | 'Low';
  isRead: boolean;
  targetRole?: string;
  targetDepartment?: string;
  targetDepartments?: string[];
  targetUser?: string;
  approvalRequestId?: string;
  metadata?: any;
  createdAt: string;
  readAt?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { employee } = useAuth();

  // Fetch notifications for current user
  const fetchNotifications = useCallback(async () => {
    if (!employee?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // Get notifications targeted to this user or their department
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`target_user_id.eq.${employee.id},target_department.eq.${employee.department}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      const mappedNotifications: Notification[] = (data || []).map((n: any) => ({
        id: n.id,
        type: n.type || 'system',
        title: n.title,
        message: n.message,
        department: n.target_department || '',
        priority: (n.priority?.charAt(0).toUpperCase() + n.priority?.slice(1)) as 'High' | 'Medium' | 'Low' || 'Medium',
        isRead: n.is_read || false,
        targetRole: n.target_role,
        targetDepartment: n.target_department,
        createdAt: n.created_at,
        readAt: n.read_at
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [employee?.id, employee?.department]);

  // Create notification for approval requests
  const createApprovalNotification = async (
    requestData: {
      id: string;
      title: string;
      amount: string;
      requestedBy: string;
      department: string;
      priority: string;
    }
  ) => {
    try {
      const amount = typeof requestData.amount === 'string' 
        ? parseFloat(requestData.amount.replace(/[^\d.-]/g, '')) 
        : requestData.amount;

      const { error } = await supabase
        .from('notifications')
        .insert({
          type: 'approval_request',
          title: 'New Approval Request',
          message: `${requestData.title} - ${requestData.requestedBy} requests approval for ${amount?.toLocaleString() || 0} UGX`,
          priority: requestData.priority?.toLowerCase() || 'medium',
          target_department: requestData.department,
          is_read: false
        });

      if (error) throw error;
      console.log('Approval notification created');
    } catch (error) {
      console.error('Error creating approval notification:', error);
    }
  };

  // Create system notification
  const createSystemNotification = async (
    title: string,
    message: string,
    targetDepartment?: string,
    targetRole?: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium'
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          type: 'system',
          title,
          message,
          priority: priority.toLowerCase(),
          target_department: targetDepartment,
          target_role: targetRole,
          is_read: false
        });

      if (error) throw error;
      console.log('System notification created');
    } catch (error) {
      console.error('Error creating system notification:', error);
    }
  };

  // Create role assignment notification
  const createRoleAssignmentNotification = async (
    assignedToName: string,
    role: string,
    permissions: string[],
    assignedBy: string
  ) => {
    try {
      const permissionsList = permissions.length > 0 ? permissions.join(', ') : 'basic access';
      
      // Get the employee's ID by name
      const { data: targetEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('name', assignedToName)
        .single();

      const { error } = await supabase
        .from('notifications')
        .insert({
          type: 'system',
          title: 'New Role Assigned',
          message: `You have been assigned the role of ${role} by ${assignedBy}. You can now access: ${permissionsList}`,
          priority: 'high',
          target_user_id: targetEmployee?.id,
          is_read: false
        });

      if (error) throw error;
      console.log('Role assignment notification created');
    } catch (error) {
      console.error('Error creating role assignment notification:', error);
    }
  };

  // Create workflow status notification
  const createWorkflowNotification = async (
    title: string,
    message: string,
    fromDepartment: string,
    toDepartment: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium',
    metadata?: any
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          type: 'system',
          title,
          message,
          priority: priority.toLowerCase(),
          target_department: toDepartment,
          is_read: false
        });

      if (error) throw error;
      console.log('Workflow notification created');
    } catch (error) {
      console.error('Error creating workflow notification:', error);
    }
  };

  // Create pricing notification
  const createPricingNotification = async (
    supplierName: string,
    batchNumber: string,
    price: number,
    assessedBy: string
  ) => {
    try {
      await createWorkflowNotification(
        'Coffee Pricing Completed',
        `Supplier ${supplierName} coffee (Batch ${batchNumber}) has been priced at UGX ${price.toLocaleString()}/kg by ${assessedBy}. Ready for payment processing.`,
        'Quality',
        'Store',
        'Medium'
      );
    } catch (error) {
      console.error('Error creating pricing notification:', error);
    }
  };

  // Create approval notification
  const createApprovalCompleteNotification = async (
    title: string,
    approvedItem: string,
    approvedBy: string,
    amount?: number,
    targetDepartment?: string
  ) => {
    try {
      const amountText = amount ? ` for UGX ${amount.toLocaleString()}` : '';
      await createWorkflowNotification(
        title,
        `${approvedItem} has been approved by ${approvedBy}${amountText}. You can now proceed with the next steps.`,
        'Finance',
        targetDepartment || 'Store',
        'High'
      );
    } catch (error) {
      console.error('Error creating approval notification:', error);
    }
  };

  // Create announcement notification - supports multiple departments
  const createAnnouncement = async (
    title: string,
    message: string,
    fromDepartment: string,
    targetDepartments: string[],
    targetRole?: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium'
  ) => {
    try {
      console.log('Creating announcement:', { title, message, fromDepartment, targetDepartments, targetRole, priority });
      
      // Get all employees from targeted departments
      const { data: targetEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, department')
        .in('department', targetDepartments)
        .eq('status', 'Active');

      if (empError) throw empError;

      // Create a notification for each targeted employee
      const notifications = (targetEmployees || []).map(emp => ({
        type: 'announcement',
        title,
        message,
        priority: priority.toLowerCase(),
        target_user_id: emp.id,
        target_department: emp.department,
        target_role: targetRole,
        is_read: false
      }));

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
        console.log(`Announcement created for ${notifications.length} employees`);
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  // Clear all notifications for current user only
  const clearAllNotifications = async () => {
    if (!employee?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('target_user_id', employee.id);

      if (error) throw error;
      
      setNotifications([]);
      setUnreadCount(0);
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      console.log('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete individual notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      console.log('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!employee?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .or(`target_user_id.eq.${employee.id},target_department.eq.${employee.department}`);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      console.log('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Fetch on mount and set up real-time subscription
  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription for new notifications
    if (employee?.id) {
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          (payload) => {
            console.log('📬 Notification change detected:', payload.eventType);
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [employee?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    createApprovalNotification,
    createSystemNotification,
    createAnnouncement,
    createRoleAssignmentNotification,
    createWorkflowNotification,
    createPricingNotification,
    createApprovalCompleteNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    deleteNotification,
    refetch: fetchNotifications
  };
};
