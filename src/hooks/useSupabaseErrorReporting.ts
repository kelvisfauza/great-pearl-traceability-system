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

// Human-readable error type labels
const ERROR_TYPE_LABELS: Record<string, string> = {
  database: 'Database Error',
  network: 'Network Error',
  authentication: 'Login/Auth Error',
  permission: 'Permission Error',
  workflow: 'Workflow Error',
  validation: 'Data Validation Error',
  system: 'System Error',
};

// Parse raw error details into clear human-readable info
const parseErrorContext = (description: string, url?: string, component?: string) => {
  const lower = description.toLowerCase();
  
  // Identify what was being done
  let action = 'Unknown action';
  let affected = '';
  
  // Parse URL path to determine page/module
  if (url) {
    const path = new URL(url).pathname;
    const moduleMap: Record<string, string> = {
      '/it-department': 'IT Department',
      '/store': 'Store Management',
      '/quality': 'Quality Control',
      '/finance': 'Finance',
      '/hr': 'HR Department',
      '/sales': 'Sales & Marketing',
      '/admin': 'Admin Panel',
      '/data-analyst': 'Data Analyst',
      '/suppliers': 'Suppliers',
      '/eudr': 'EUDR Documentation',
      '/v2/quality': 'Quality Assessment (V2)',
      '/v2/store': 'Store (V2)',
    };
    for (const [key, label] of Object.entries(moduleMap)) {
      if (path.startsWith(key)) {
        affected = label;
        break;
      }
    }
    if (!affected) affected = path === '/' ? 'Dashboard' : path.replace(/\//g, ' ').trim();
  }

  // Parse what the request was doing
  if (lower.includes('employees')) action = 'Loading employee data';
  else if (lower.includes('attendance')) action = 'Loading attendance records';
  else if (lower.includes('coffee_records') || lower.includes('coffee-records')) action = 'Loading coffee records';
  else if (lower.includes('quality_assessments') || lower.includes('quality-assessments')) action = 'Loading quality assessments';
  else if (lower.includes('suppliers')) action = 'Loading supplier data';
  else if (lower.includes('finance') || lower.includes('payment')) action = 'Loading finance/payment data';
  else if (lower.includes('eudr') || lower.includes('dispatch')) action = 'Loading EUDR data';
  else if (lower.includes('market_prices')) action = 'Loading market prices';
  else if (lower.includes('approval')) action = 'Loading approval requests';
  else if (lower.includes('message') || lower.includes('sms')) action = 'Sending message/SMS';
  else if (lower.includes('ledger') || lower.includes('wallet')) action = 'Loading wallet/ledger data';
  else if (lower.includes('user_activity') || lower.includes('loyalty')) action = 'Tracking user activity';
  else if (lower.includes('announcement')) action = 'Processing announcement';

  // Parse HTTP status codes
  let statusInfo = '';
  if (lower.includes('406')) statusInfo = 'No data found (HTTP 406) - the record may not exist yet';
  else if (lower.includes('401') || lower.includes('unauthorized')) statusInfo = 'Authentication expired or invalid';
  else if (lower.includes('403') || lower.includes('forbidden')) statusInfo = 'Access denied - insufficient permissions';
  else if (lower.includes('404')) statusInfo = 'Resource not found';
  else if (lower.includes('500')) statusInfo = 'Server error - Supabase may be experiencing issues';
  else if (lower.includes('timeout') || lower.includes('timed out')) statusInfo = 'Request took too long - possible slow connection';
  else if (lower.includes('network') || lower.includes('fetch')) statusInfo = 'Network connection failed';

  return { action, affected, statusInfo };
};

const getSmartRecommendation = (errorType: string, description: string): string => {
  const lower = description.toLowerCase();
  
  if (lower.includes('406')) {
    return '1. This usually means the query returned no rows\n2. Check if the data exists in the database\n3. The code may need .maybeSingle() instead of .single()\n4. Not critical - may resolve when data is entered';
  }
  
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('jwt')) {
    return '1. User session may have expired\n2. Ask the user to log out and log back in\n3. Check if the auth token is being refreshed properly';
  }

  if (lower.includes('403') || lower.includes('permission') || lower.includes('rls')) {
    return '1. Check RLS policies for the affected table\n2. Verify the user has the correct role/permissions\n3. Review the employees table for permission assignments';
  }

  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('fetch')) {
    return '1. Check internet connection on the device\n2. Try refreshing the page\n3. If persistent, check if Supabase is operational\n4. May be a temporary connectivity issue';
  }

  if (lower.includes('timeout')) {
    return '1. The query may be too slow - check for missing indexes\n2. Try again - could be a temporary spike\n3. If persistent, optimize the database query';
  }

  if (lower.includes('sms') || lower.includes('message')) {
    return '1. Check SMS provider (YoolaSMS/Infobip) status\n2. Verify the phone number format\n3. Check SMS credit balance\n4. Review edge function logs for details';
  }

  if (errorType === 'database') {
    return '1. Check Supabase dashboard for service status\n2. Review the specific table and RLS policies\n3. Check if the query parameters are correct';
  }

  return '1. Check browser console for detailed error\n2. Try refreshing the page\n3. If persistent, contact IT for investigation';
};

const getSmartTitle = (errorType: string, description: string): string => {
  const lower = description.toLowerCase();
  const typeLabel = ERROR_TYPE_LABELS[errorType] || 'System Error';

  if (lower.includes('406') && lower.includes('employees')) return 'Employee Data Not Found';
  if (lower.includes('406')) return `${typeLabel} - Data Not Found (406)`;
  if (lower.includes('401') || lower.includes('unauthorized')) return 'Authentication Session Expired';
  if (lower.includes('403')) return 'Access Denied - Permission Required';
  if (lower.includes('500')) return 'Server Error - Supabase Issue';
  if (lower.includes('timeout')) return `${typeLabel} - Request Timeout`;
  if (lower.includes('failed to fetch') || lower.includes('network')) return 'Network Connection Failed';
  if (lower.includes('sms') && lower.includes('fail')) return 'SMS Delivery Failed';
  
  return typeLabel;
};

// IT alert recipients
const IT_ALERT_PHONES = [
  { name: 'Timothy', phone: '+256773318456' },
  { name: 'Fauza 2', phone: '+256 393 001 626' },
];

export const useSupabaseErrorReporting = () => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { employee, user } = useAuth();

  const getSeverity = (errorType: string, message: string): 'low' | 'medium' | 'high' | 'critical' => {
    const lower = message.toLowerCase();
    
    if (lower.includes('critical') || lower.includes('fatal') || lower.includes('crash')) return 'critical';
    if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('authentication')) return 'high';
    if (lower.includes('500') || lower.includes('server error')) return 'high';
    if (lower.includes('failed to fetch') || lower.includes('network')) return 'high';
    if (lower.includes('sms') && lower.includes('fail')) return 'high';
    if (lower.includes('permission') || lower.includes('403')) return 'medium';
    if (lower.includes('406')) return 'low';
    if (lower.includes('timeout')) return 'medium';
    
    return 'medium';
  };

  // Send SMS alert to IT team for high/critical errors
  const sendITAlert = useCallback(async (title: string, description: string, severity: string, component: string) => {
    if (severity !== 'high' && severity !== 'critical') return;
    
    const shortDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;
    const message = `Great Agro IT Alert: ${title}. ${shortDesc}. Module: ${component}. Severity: ${severity.toUpperCase()}. Check IT Dashboard.`;

    for (const recipient of IT_ALERT_PHONES) {
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://pudfybkyfedeggmokhco.supabase.co'}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'}`,
          },
          body: JSON.stringify({
            phone: recipient.phone,
            to: recipient.phone,
            message,
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.error(`IT alert SMS to ${recipient.name} failed:`, t);
        } else {
          await res.text();
          console.log(`IT alert SMS sent to ${recipient.name}`);
        }
      } catch (err) {
        console.error(`IT alert SMS error for ${recipient.name}:`, err);
      }
    }
  }, []);

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
      const recommendation = getSmartRecommendation(errorType, description);
      const smartTitle = getSmartTitle(errorType, description);
      const currentUrl = window.location.href;
      const { action, affected, statusInfo } = parseErrorContext(description, currentUrl, component);

      // Build clear description
      const clearDescription = [
        statusInfo && `What happened: ${statusInfo}`,
        action && `Action: ${action}`,
        affected && `Module: ${affected}`,
        description,
      ].filter(Boolean).join('\n');
      
      const errorData = {
        title: smartTitle,
        description: clearDescription,
        error_type: errorType,
        severity,
        component: affected || component,
        stack_trace: stackTrace,
        user_agent: navigator.userAgent,
        user_id: user?.id || employee?.id,
        user_email: user?.email || employee?.email,
        url: currentUrl,
        status: 'open' as const,
        recommendation,
        metadata: { ...metadata, original_title: title, action, affected, statusInfo }
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

      setErrors(prev => [data as SystemError, ...prev]);

      // Send SMS alerts for high/critical
      sendITAlert(smartTitle, clearDescription, severity, affected || component);

      if (severity === 'critical' || severity === 'high') {
        toast({
          title: "System Error Detected",
          description: `${smartTitle} - IT has been notified via SMS`,
          variant: "destructive"
        });
      }

      return data.id;
    } catch (err) {
      console.error('Error reporting failed:', err);
      return null;
    }
  }, [user, employee, toast, sendITAlert]);

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
