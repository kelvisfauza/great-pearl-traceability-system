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
      const permissionsList = permissions.length > 0 ? permissions.join(', ') : 'basic access';
      await addDoc(collection(db, 'notifications'), {
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
        createdAt: new Date().toISOString()
      });
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
    console.log('useNotifications - employee:', employee);
    if (!employee) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      console.log('useNotifications - Raw snapshot docs:', snapshot.docs.length);
      const allNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      console.log('useNotifications - All notifications:', allNotifications);

      // Filter notifications based on user role and department
      const userNotifications = allNotifications.filter(notification => {
        console.log('Filtering notification:', notification.id, 'targetDepartment:', notification.targetDepartment, 'type:', notification.type);
        
        // Show all notifications to administrators
        if (employee.role === 'Administrator') {
          console.log('Showing to admin:', notification.id);
          return true;
        }
        
        // Show notifications targeted to user's role
        if (notification.targetRole && notification.targetRole === employee.role) {
          console.log('Showing by role match:', notification.id);
          return true;
        }
        
        // Show notifications targeted to user's department or permissions
        if (notification.targetDepartment) {
          // Special handling for "All Departments" - show to everyone
          if (notification.targetDepartment === 'All Departments') {
            console.log('Showing to all departments:', notification.id);
            return true;
          }
          
          // Check exact department match
          if (notification.targetDepartment === employee.department) {
            console.log('Showing by department match:', notification.id);
            return true;
          }
          
          // Check if user has permissions for the target department
          if (employee.permissions && employee.permissions.includes(notification.targetDepartment)) {
            console.log('Showing by permission match:', notification.id);
            return true;
          }
          
          // Special case for Data Analysis permission mapping to Reports department
          if (notification.targetDepartment === 'Reports' && 
              employee.permissions && employee.permissions.includes('Data Analysis')) {
            console.log('Showing by Data Analysis permission:', notification.id);
            return true;
          }
          
          // Special case for Data Analysis department mapping to Reports notifications
          if (employee.department === 'Data Analysis' && notification.targetDepartment === 'Reports') {
            console.log('Showing to Data Analysis department:', notification.id);
            return true;
          }
        }

        // Check multiple target departments (new array format)
        if (notification.targetDepartments && Array.isArray(notification.targetDepartments)) {
          const isTargeted = notification.targetDepartments.some(targetDept => {
            if (targetDept === 'All Departments') return true;
            if (targetDept === employee.department) return true;
            if (employee.permissions && employee.permissions.includes(targetDept)) return true;
            if (targetDept === 'Reports' && employee.permissions && employee.permissions.includes('Data Analysis')) return true;
            if (employee.department === 'Data Analysis' && targetDept === 'Reports') return true;
            return false;
          });
          
          if (isTargeted) {
            console.log('Showing by targetDepartments match:', notification.id);
            return true;
          }
        }
        
        // Show notifications from user's department (announcements from same department)
        if (notification.department === employee.department && notification.type === 'announcement') {
          console.log('Showing by same department announcement:', notification.id);
          return true;
        }
        
        // Show system notifications to everyone
        if (notification.type === 'system' && !notification.targetRole && !notification.targetDepartment) {
          console.log('Showing system notification to everyone:', notification.id);
          return true;
        }
        
        // Show announcements without specific targets to everyone
        if (notification.type === 'announcement' && !notification.targetRole && !notification.targetDepartment) {
          console.log('Showing announcement without targets to everyone:', notification.id);
          return true;
        }
        
        console.log('Filtering out notification:', notification.id);
        return false;
      });
      console.log('useNotifications - Filtered notifications:', userNotifications);
      console.log('useNotifications - Employee role/department:', employee.role, employee.department);

      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.isRead).length);
      console.log('useNotifications - Unread count:', userNotifications.filter(n => !n.isRead).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [employee]);

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