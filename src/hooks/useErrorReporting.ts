import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useNotifications } from './useNotifications';
import { useToast } from './use-toast';

export interface SystemError {
  id: string;
  title: string;
  description: string;
  errorType: 'database' | 'network' | 'authentication' | 'permission' | 'workflow' | 'validation' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  stackTrace?: string;
  userAgent?: string;
  userId?: string;
  timestamp: string;
  status: 'open' | 'investigating' | 'resolved';
  recommendation: string;
  fixApplied?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  affectedUsers?: number;
}

const ERROR_RECOMMENDATIONS = {
  database: {
    connection: {
      title: "Database Connection Failed",
      recommendation: "1. Check Firebase/Supabase service status\n2. Verify network connectivity\n3. Check API keys and credentials\n4. Restart the database connection\n5. Review firewall settings"
    },
    timeout: {
      title: "Database Operation Timeout", 
      recommendation: "1. Optimize slow queries\n2. Add database indexes\n3. Increase timeout settings\n4. Check database server resources\n5. Review query complexity"
    },
    permission: {
      title: "Database Permission Denied",
      recommendation: "1. Review RLS policies\n2. Check user authentication status\n3. Verify table permissions\n4. Update security rules\n5. Check API key permissions"
    }
  },
  network: {
    failed: {
      title: "Network Request Failed",
      recommendation: "1. Check internet connectivity\n2. Verify API endpoint URLs\n3. Check CORS settings\n4. Review network firewall\n5. Test with different network"
    },
    timeout: {
      title: "Network Timeout",
      recommendation: "1. Increase request timeout\n2. Check server response time\n3. Optimize payload size\n4. Use request retry logic\n5. Check CDN configuration"
    }
  },
  authentication: {
    failed: {
      title: "Authentication Failed",
      recommendation: "1. Check user credentials\n2. Verify JWT token validity\n3. Refresh authentication token\n4. Check session expiry\n5. Review auth provider settings"
    },
    expired: {
      title: "Session Expired",
      recommendation: "1. Implement auto token refresh\n2. Extend session duration\n3. Add session warning alerts\n4. Check token storage\n5. Review authentication flow"
    }
  },
  permission: {
    denied: {
      title: "Permission Denied",
      recommendation: "1. Review user role assignments\n2. Check permission mappings\n3. Update user access levels\n4. Verify department assignments\n5. Check RLS policies"
    }
  },
  workflow: {
    tracking: {
      title: "Workflow Tracking Failed",
      recommendation: "1. Check workflow database tables\n2. Verify data integrity\n3. Review workflow step logic\n4. Check notification system\n5. Validate workflow permissions"
    }
  },
  validation: {
    failed: {
      title: "Data Validation Failed",
      recommendation: "1. Review input validation rules\n2. Check data format requirements\n3. Update validation schemas\n4. Add client-side validation\n5. Improve error messages"
    }
  },
  system: {
    general: {
      title: "System Error",
      recommendation: "1. Check system logs\n2. Review recent deployments\n3. Monitor system resources\n4. Check third-party services\n5. Restart affected services"
    }
  }
};

export const useErrorReporting = () => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Make notifications optional to avoid dependency issues
  let createAnnouncement: any = null;
  try {
    const notifications = useNotifications();
    createAnnouncement = notifications.createAnnouncement;
  } catch (error) {
    console.log('Notifications not available, continuing without notifications');
  }
  
  const { toast } = useToast();

  const getRecommendation = (errorType: string, errorMessage: string): string => {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (errorType === 'database') {
      if (lowerMessage.includes('connection') || lowerMessage.includes('network')) {
        return ERROR_RECOMMENDATIONS.database.connection.recommendation;
      }
      if (lowerMessage.includes('timeout')) {
        return ERROR_RECOMMENDATIONS.database.timeout.recommendation;
      }
      if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
        return ERROR_RECOMMENDATIONS.database.permission.recommendation;
      }
    }
    
    if (errorType === 'network') {
      if (lowerMessage.includes('timeout')) {
        return ERROR_RECOMMENDATIONS.network.timeout.recommendation;
      }
      return ERROR_RECOMMENDATIONS.network.failed.recommendation;
    }
    
    if (errorType === 'authentication') {
      if (lowerMessage.includes('expired') || lowerMessage.includes('session')) {
        return ERROR_RECOMMENDATIONS.authentication.expired.recommendation;
      }
      return ERROR_RECOMMENDATIONS.authentication.failed.recommendation;
    }
    
    if (errorType === 'permission') {
      return ERROR_RECOMMENDATIONS.permission.denied.recommendation;
    }
    
    if (errorType === 'workflow') {
      return ERROR_RECOMMENDATIONS.workflow.tracking.recommendation;
    }
    
    if (errorType === 'validation') {
      return ERROR_RECOMMENDATIONS.validation.failed.recommendation;
    }
    
    return ERROR_RECOMMENDATIONS.system.general.recommendation;
  };

  const getSeverity = (errorType: string, errorMessage: string): 'low' | 'medium' | 'high' | 'critical' => {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('critical') || lowerMessage.includes('fatal')) return 'critical';
    if (lowerMessage.includes('connection') || lowerMessage.includes('authentication')) return 'high';
    if (lowerMessage.includes('permission') || lowerMessage.includes('workflow')) return 'medium';
    
    return 'low';
  };

  const reportError = async (
    title: string,
    description: string,
    errorType: SystemError['errorType'],
    component: string,
    stackTrace?: string,
    userId?: string
  ) => {
    try {
      const severity = getSeverity(errorType, description);
      const recommendation = getRecommendation(errorType, description);
      
      const errorData: Omit<SystemError, 'id'> = {
        title,
        description,
        errorType,
        severity,
        component,
        stackTrace,
        userAgent: navigator.userAgent,
        userId,
        timestamp: new Date().toISOString(),
        status: 'open',
        recommendation,
        affectedUsers: 1
      };

      console.log('Reporting error to IT department:', errorData);

      const docRef = await addDoc(collection(db, 'system_errors'), errorData);
      console.log('Error reported with ID:', docRef.id);

      // Notify IT department immediately for high/critical errors
      if (severity === 'high' || severity === 'critical') {
        if (createAnnouncement) {
          await createAnnouncement(
            `${severity.toUpperCase()} System Error Reported`,
            `${title}: ${description}`,
            'System',
            ['IT Management'],
            severity === 'critical' ? 'High' : 'Medium'
          );
        }
      }

      // Show toast to user (but don't overwhelm them)
      if (severity === 'high' || severity === 'critical') {
        toast({
          title: "System Error Reported",
          description: "IT department has been notified and will investigate.",
          variant: "destructive"
        });
      }

      await fetchErrors();
      return docRef.id;
    } catch (error) {
      console.error('Failed to report error:', error);
      // Fallback notification
      toast({
        title: "Error Reporting Failed",
        description: "Could not report error to IT department",
        variant: "destructive"
      });
    }
  };

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const errorsQuery = query(
        collection(db, 'system_errors'), 
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(errorsQuery);
      
      const errorsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SystemError[];
      
      setErrors(errorsList);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateErrorStatus = async (
    errorId: string, 
    status: SystemError['status'],
    resolvedBy?: string
  ) => {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString()
      };

      if (status === 'resolved' && resolvedBy) {
        updateData.resolvedBy = resolvedBy;
        updateData.resolvedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'system_errors', errorId), updateData);
      await fetchErrors();

      toast({
        title: "Error Status Updated",
        description: `Error marked as ${status}`
      });
    } catch (error) {
      console.error('Failed to update error status:', error);
      toast({
        title: "Update Failed",
        description: "Could not update error status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchErrors();
  }, []);

  return {
    errors,
    loading,
    reportError,
    updateErrorStatus,
    fetchErrors,
    refetch: fetchErrors
  };
};