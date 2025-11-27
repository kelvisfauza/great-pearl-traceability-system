import { useState, useEffect } from 'react';
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
  targetDepartments?: string[]; // New array format for multi-department announcements
  targetUser?: string; // Target specific user by name
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

      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Notification created (disabled):', {
        type: 'approval_request',
        title: 'New Approval Request',
        requestedBy: requestData.requestedBy,
        amount: amount || 0
      });
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
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Notification created (disabled):', {
        type: 'system',
        title,
        message
      });
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
      console.log('createRoleAssignmentNotification called with:', {
        assignedToName,
        role,
        permissions,
        assignedBy,
        currentEmployee: employee?.name
      });
      
      const permissionsList = permissions.length > 0 ? permissions.join(', ') : 'basic access';
      const notificationData = {
        type: 'system',
        title: 'New Role Assigned',
        message: `You have been assigned the role of ${role} by ${assignedBy}. You can now access: ${permissionsList}`,
        department: 'Human Resources',
        senderName: assignedBy,
        senderDepartment: 'Human Resources',
        priority: 'High',
        isRead: false,
        targetRole: undefined,
        targetDepartment: undefined,
        targetUser: assignedToName, // Target specifically this user
        createdAt: new Date().toISOString()
      };
      
      console.log('Creating notification with data:', notificationData);
      
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Role assignment notification created (disabled):', notificationData);
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
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Workflow notification created (disabled):', {
        type: 'system',
        title,
        message,
        fromDepartment,
        toDepartment
      });
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
        'Medium',
        { supplierName, batchNumber, price, assessedBy }
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
      
      const notificationData: any = {
        type: 'announcement',
        title,
        message,
        department: fromDepartment,
        senderName: employee?.name || 'System',
        senderDepartment: employee?.department || fromDepartment,
        priority,
        isRead: false,
        targetDepartments: targetDepartments, // Store as array
        createdAt: new Date().toISOString()
      };

      // Only add targetRole if it is not undefined
      if (targetRole !== undefined) {
        notificationData.targetRole = targetRole;
      }
      
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Announcement created (disabled):', notificationData);
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  // Clear all notifications for current user only
  const clearAllNotifications = async () => {
    try {
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('All notifications cleared (disabled)');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Notification marked as read (disabled):', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete individual notification
  const deleteNotification = async (notificationId: string) => {
    try {
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('Notification deleted (disabled):', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Notifications disabled - Firebase has been migrated to Supabase
      console.log('All notifications marked as read (disabled)');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    // Notifications disabled - Firebase has been migrated to Supabase
    // Set empty notifications array
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
  }, [employee?.id]);

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
    deleteNotification
  };
};