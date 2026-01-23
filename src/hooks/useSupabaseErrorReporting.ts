import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemError {
  id: string;
  title: string;
  description: string;
  error_type: 'database' | 'network' | 'authentication' | 'permission' | 'workflow' | 'validation' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  stack_trace?: string;
  user_agent?: string;
  user_id?: string;
  user_email?: string;
  url?: string;
  status: 'open' | 'investigating' | 'resolved';
  recommendation?: string;
  resolved_by?: string;
  resolved_at?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

const ERROR_RECOMMENDATIONS: Record<string, Record<string, string>> = {
  database: {
    connection: "1. Check Supabase service status\n2. Verify network connectivity\n3. Check API keys\n4. Review RLS policies",
    timeout: "1. Optimize slow queries\n2. Add database indexes\n3. Check server resources",
    permission: "1. Review RLS policies\n2. Check user authentication\n3. Verify table permissions"
  },
  network: {
    failed: "1. Check internet connectivity\n2. Verify API endpoints\n3. Check CORS settings",
    timeout: "1. Increase request timeout\n2. Check server response time\n3. Optimize payload size"
  },
  authentication: {
    failed: "1. Check user credentials\n2. Verify JWT token\n3. Refresh authentication token",
    expired: "1. Implement auto token refresh\n2. Extend session duration\n3. Add session warnings"
  },
  permission: {
    denied: "1. Review user role assignments\n2. Check permission mappings\n3. Update access levels"
  },
  workflow: {
    tracking: "1. Check workflow tables\n2. Verify data integrity\n3. Review workflow logic"
  },
  validation: {
    failed: "1. Review validation rules\n2. Check data format\n3. Update validation schemas"
  },
  system: {
    general: "1. Check system logs\n2. Review recent deployments\n3. Monitor resources"
  }
};

export const useSupabaseErrorReporting = () => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { employee, user } = useAuth();

  const getRecommendation = (errorType: string, message: string): string => {
    const lower = message.toLowerCase();
    const typeRecs = ERROR_RECOMMENDATIONS[errorType] || ERROR_RECOMMENDATIONS.system;
    
    if (lower.includes('connection') || lower.includes('network')) {
      return typeRecs.connection || typeRecs.general || ERROR_RECOMMENDATIONS.system.general;
    }
    if (lower.includes('timeout')) {
      return typeRecs.timeout || typeRecs.general || ERROR_RECOMMENDATIONS.system.general;
    }
    if (lower.includes('permission') || lower.includes('denied')) {
      return typeRecs.permission || typeRecs.denied || ERROR_RECOMMENDATIONS.system.general;
    }
    if (lower.includes('expired') || lower.includes('session')) {
      return typeRecs.expired || typeRecs.general || ERROR_RECOMMENDATIONS.system.general;
    }
    
    return typeRecs.failed || typeRecs.general || ERROR_RECOMMENDATIONS.system.general;
  };

  const getSeverity = (errorType: string, message: string): 'low' | 'medium' | 'high' | 'critical' => {
    const lower = message.toLowerCase();
    
    if (lower.includes('critical') || lower.includes('fatal') || lower.includes('crash')) return 'critical';
    if (lower.includes('connection') || lower.includes('authentication') || lower.includes('unauthorized')) return 'high';
    if (lower.includes('permission') || lower.includes('workflow') || lower.includes('failed')) return 'medium';
    
    return 'low';
  };

  const reportError = useCallback(async (
    title: string,
    description: string,
    errorType: SystemError['error_type'],
    component: string,
    stackTrace?: string,
    metadata?: any
  ) => {
    try {
      const severity = getSeverity(errorType, description);
      const recommendation = getRecommendation(errorType, description);
      
      const errorData = {
        title,
        description,
        error_type: errorType,
        severity,
        component,
        stack_trace: stackTrace,
        user_agent: navigator.userAgent,
        user_id: user?.id || employee?.id,
        user_email: user?.email || employee?.email,
        url: window.location.href,
        status: 'open' as const,
        recommendation,
        metadata
      };

      const { data, error } = await supabase
        .from('system_errors')
        .insert(errorData)
        .select()
        .single();

      if (error) {
        console.error('Failed to report error to database:', error);
        return null;
      }

      // Add to local state
      setErrors(prev => [data as SystemError, ...prev]);

      // Show toast for high/critical errors
      if (severity === 'critical' || severity === 'high') {
        toast({
          title: "System Error Detected",
          description: `${title} - IT has been notified`,
          variant: "destructive"
        });
      }

      return data.id;
    } catch (err) {
      console.error('Error reporting failed:', err);
      return null;
    }
  }, [user, employee, toast]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      setErrors((data || []) as SystemError[]);
    } catch (err) {
      console.error('Failed to fetch errors:', err);
      toast({
        title: "Failed to Load Errors",
        description: "Could not fetch system errors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateErrorStatus = useCallback(async (
    errorId: string,
    status: SystemError['status'],
    resolvedBy?: string
  ) => {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'resolved') {
        updateData.resolved_by = resolvedBy || employee?.name || 'IT Department';
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('system_errors')
        .update(updateData)
        .eq('id', errorId);

      if (error) throw error;

      // Update local state
      setErrors(prev => prev.map(e => 
        e.id === errorId ? { ...e, ...updateData } : e
      ));

      toast({
        title: "Status Updated",
        description: `Error marked as ${status}`
      });
    } catch (err) {
      console.error('Failed to update error status:', err);
      toast({
        title: "Update Failed",
        description: "Could not update error status",
        variant: "destructive"
      });
    }
  }, [employee, toast]);

  const deleteError = useCallback(async (errorId: string) => {
    try {
      const { error } = await supabase
        .from('system_errors')
        .delete()
        .eq('id', errorId);

      if (error) throw error;

      setErrors(prev => prev.filter(e => e.id !== errorId));

      toast({
        title: "Error Deleted",
        description: "Error record has been removed"
      });
    } catch (err) {
      console.error('Failed to delete error:', err);
    }
  }, [toast]);

  // Set up real-time subscription
  useEffect(() => {
    fetchErrors();

    const channel = supabase
      .channel('system-errors-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_errors' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setErrors(prev => [payload.new as SystemError, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setErrors(prev => prev.map(e => 
              e.id === payload.new.id ? payload.new as SystemError : e
            ));
          } else if (payload.eventType === 'DELETE') {
            setErrors(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchErrors]);

  // Statistics
  const getErrorStats = useCallback(() => {
    return {
      total: errors.length,
      critical: errors.filter(e => e.severity === 'critical' && e.status !== 'resolved').length,
      high: errors.filter(e => e.severity === 'high' && e.status !== 'resolved').length,
      medium: errors.filter(e => e.severity === 'medium' && e.status !== 'resolved').length,
      low: errors.filter(e => e.severity === 'low' && e.status !== 'resolved').length,
      open: errors.filter(e => e.status === 'open').length,
      investigating: errors.filter(e => e.status === 'investigating').length,
      resolved: errors.filter(e => e.status === 'resolved').length
    };
  }, [errors]);

  return {
    errors,
    loading,
    reportError,
    fetchErrors,
    updateErrorStatus,
    deleteError,
    getErrorStats,
    refetch: fetchErrors
  };
};
