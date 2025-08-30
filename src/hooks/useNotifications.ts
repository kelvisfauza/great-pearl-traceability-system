import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

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

      await addDoc(collection(db, 'notifications'), {
        type: 'approval_request',
        title: 'New Approval Request',
        message: `You have a pending approval from ${requestData.requestedBy} of UGX ${amount?.toLocaleString() || requestData.amount}`,
        amount: amount || 0,
        department: requestData.department,
        requestedBy: requestData.requestedBy,
        senderName: requestData.requestedBy,
        senderDepartment: requestData.department,
        priority: requestData.priority,
        isRead: false,
        targetRole: 'Administrator',
        approvalRequestId: requestData.id,
        createdAt: new Date().toISOString()
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
      await addDoc(collection(db, 'notifications'), {
        type: 'system',
        title,
        message,
        department: 'IT',
        senderName: employee?.name || 'System',
        senderDepartment: employee?.department || 'IT',
        priority,
        isRead: false,
        targetRole,
        targetDepartment,
        createdAt: new Date().toISOString()
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
      
      await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Role assignment notification created successfully');
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
      await addDoc(collection(db, 'notifications'), {
        type: 'system',
        title,
        message,
        department: fromDepartment,
        senderName: employee?.name || 'System',
        senderDepartment: fromDepartment,
        priority,
        isRead: false,
        targetDepartment: toDepartment,
        metadata,
        createdAt: new Date().toISOString()
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

      await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Announcement created successfully');
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  // Clear all notifications for current user only
  const clearAllNotifications = async () => {
    try {
      const promises = notifications.map(notification =>
        deleteDoc(doc(db, 'notifications', notification.id))
      );
      await Promise.all(promises);
      console.log('All notifications cleared successfully');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        readAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete individual notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      console.log('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const promises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true,
          readAt: new Date().toISOString()
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    if (!employee?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, 'notifications')
      // Temporarily removed orderBy to debug potential indexing issues
      // orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      if (!mounted) return;
      
      const allNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      // Filter notifications based on user role and department
      const userNotifications = allNotifications.filter(notification => {
        // Show all notifications to administrators
        if (employee.role === 'Administrator') {
          return true;
        }
        
        // Show notifications targeted to specific user by name
        if (notification.targetUser && notification.targetUser === employee.name) {
          return true;
        }
        
        // Show notifications targeted to user's role
        if (notification.targetRole && notification.targetRole === employee.role) {
          return true;
        }
        
        // Show notifications targeted to user's department or permissions
        if (notification.targetDepartment) {
          // Special handling for "All Departments" - show to everyone
          if (notification.targetDepartment === 'All Departments') {
            return true;
          }
          
          // Check exact department match
          if (notification.targetDepartment === employee.department) {
            return true;
          }
          
          // Check if user has permissions for the target department (case-insensitive)
          if (employee.permissions) {
            const hasPermission = employee.permissions.some(permission => 
              permission.toLowerCase().includes(notification.targetDepartment.toLowerCase()) ||
              notification.targetDepartment.toLowerCase().includes(permission.toLowerCase()) ||
              permission === notification.targetDepartment ||
              // Special mapping for Quality Control permission to Quality department
              (permission === 'Quality Control' && notification.targetDepartment === 'Quality') ||
              (notification.targetDepartment === 'Quality Control' && employee.permissions.includes('Quality Control'))
            );
            if (hasPermission) {
              return true;
            }
          }
          
          // Special case for Quality Control permission mapping to Quality department
          if (notification.targetDepartment === 'Quality' && 
              employee.permissions && employee.permissions.includes('Quality Control')) {
            return true;
          }
          
          // Special case for Quality Control department mapping to Quality notifications
          if (employee.department === 'Quality' && notification.targetDepartment === 'Quality Control') {
            return true;
          }
          
          // Special case for Data Analysis permission mapping to Reports department
          if (notification.targetDepartment === 'Reports' && 
              employee.permissions && employee.permissions.includes('Data Analysis')) {
            return true;
          }
          
          // Special case for Data Analysis department mapping to Reports notifications
          if (employee.department === 'Data Analysis' && notification.targetDepartment === 'Reports') {
            return true;
          }
        }

        // Check multiple target departments (new array format)
        if (notification.targetDepartments && Array.isArray(notification.targetDepartments)) {
          const isTargeted = notification.targetDepartments.some(targetDept => {
            if (targetDept === 'All Departments') return true;
            if (targetDept === employee.department) return true;
            
            // Enhanced permission checking for multiple departments
            if (employee.permissions) {
              const hasPermission = employee.permissions.some(permission => 
                permission.toLowerCase().includes(targetDept.toLowerCase()) ||
                targetDept.toLowerCase().includes(permission.toLowerCase()) ||
                permission === targetDept ||
                // Special mapping for Quality Control permission to Quality department
                (permission === 'Quality Control' && targetDept === 'Quality') ||
                (targetDept === 'Quality Control' && employee.permissions.includes('Quality Control'))
              );
              if (hasPermission) return true;
            }
            
            if (targetDept === 'Quality' && employee.permissions && employee.permissions.includes('Quality Control')) return true;
            if (employee.department === 'Quality' && targetDept === 'Quality Control') return true;
            
            if (targetDept === 'Reports' && employee.permissions && employee.permissions.includes('Data Analysis')) return true;
            if (employee.department === 'Data Analysis' && targetDept === 'Reports') return true;
            return false;
          });
          
          if (isTargeted) {
            return true;
          }
        }
        
        // Show notifications from user's department (announcements from same department)
        if (notification.department === employee.department && notification.type === 'announcement') {
          return true;
        }
        
        // Show system notifications to everyone
        if (notification.type === 'system' && !notification.targetRole && !notification.targetDepartment && !notification.targetUser) {
          return true;
        }
        
        // Show announcements without specific targets to everyone
        if (notification.type === 'announcement' && !notification.targetRole && !notification.targetDepartment) {
          return true;
        }
        
        return false;
      });

      if (!mounted) return;
      
      setNotifications(userNotifications);
      const unreadCount = userNotifications.filter(n => !n.isRead).length;
      setUnreadCount(unreadCount);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
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