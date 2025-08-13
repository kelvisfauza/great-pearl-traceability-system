import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, where, getDocs } from 'firebase/firestore';
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
  priority: 'High' | 'Medium' | 'Low';
  isRead: boolean;
  targetRole?: string;
  targetDepartment?: string;
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

  // Create announcement notification
  const createAnnouncement = async (
    title: string,
    message: string,
    fromDepartment: string,
    targetDepartment?: string,
    targetRole?: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium'
  ) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'announcement',
        title,
        message,
        department: fromDepartment,
        priority,
        isRead: false,
        targetRole,
        targetDepartment,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
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
        // Show all notifications to administrators
        if (employee.role === 'Administrator') return true;
        
        // Show notifications targeted to user's role
        if (notification.targetRole && notification.targetRole === employee.role) return true;
        
        // Show notifications targeted to user's department or permissions
        if (notification.targetDepartment) {
          // Check exact department match
          if (notification.targetDepartment === employee.department) return true;
          
          // Check if user has permissions for the target department
          if (employee.permissions && employee.permissions.includes(notification.targetDepartment)) return true;
          
          // Special case for Data Analysis permission mapping to Reports department
          if (notification.targetDepartment === 'Reports' && 
              employee.permissions && employee.permissions.includes('Data Analysis')) return true;
          
          // Special case for Data Analysis department mapping to Reports notifications
          if (employee.department === 'Data Analysis' && notification.targetDepartment === 'Reports') return true;
        }
        
        // Show notifications from user's department (announcements from same department)
        if (notification.department === employee.department && notification.type === 'announcement') return true;
        
        // Show system notifications to everyone
        if (notification.type === 'system' && !notification.targetRole && !notification.targetDepartment) return true;
        
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
    markAsRead,
    markAllAsRead
  };
};