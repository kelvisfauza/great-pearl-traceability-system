import { supabase } from '@/integrations/supabase/client';

export type SecurityEventType = 
  | 'failed_login'
  | 'unauthorized_access'
  | 'permission_violation'
  | 'suspicious_activity'
  | 'data_access_violation'
  | 'role_escalation_attempt'
  | 'multiple_failed_attempts';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high';
  user_email?: string;
  user_id?: string;
  ip_address?: string;
  details: string;
  metadata?: Record<string, any>;
}

class SecurityService {
  private readonly FAILED_LOGIN_THRESHOLD = 3;
  private readonly TIME_WINDOW_MINUTES = 15;

  async logSecurityEvent(event: SecurityEvent) {
    try {
      // Log to Supabase audit_logs
      if (event.user_email) {
        const { error } = await supabase.from('audit_logs').insert({
          action: event.type,
          table_name: 'security_events',
          record_id: event.user_id || event.user_email,
          reason: event.details,
          performed_by: event.user_email,
          department: 'Security',
          record_data: {
            severity: event.severity,
            ip_address: event.ip_address,
            ...(event.metadata || {}),
          },
        });

        if (error) {
          console.error('Failed to log security event to Supabase:', error);
        }
      }

      console.log('Security event logged:', event.type);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async checkFailedLoginAttempts(email: string, ipAddress?: string) {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - this.TIME_WINDOW_MINUTES * 60 * 1000);
      
      // Query Supabase audit_logs for failed login attempts
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('performed_by', email)
        .eq('action', 'failed_login')
        .gte('created_at', fifteenMinutesAgo.toISOString())
        .limit(10);

      if (error) {
        console.error('Failed to check login attempts:', error);
        return;
      }

      const recentAttempts = data?.length || 0;

      if (recentAttempts >= this.FAILED_LOGIN_THRESHOLD) {
        await this.logSecurityEvent({
          type: 'multiple_failed_attempts',
          severity: 'high',
          user_email: email,
          ip_address: ipAddress,
          details: `${recentAttempts} failed login attempts detected in the last ${this.TIME_WINDOW_MINUTES} minutes`,
          metadata: {
            attempt_count: recentAttempts,
            time_window: this.TIME_WINDOW_MINUTES,
          },
        });
      }
    } catch (error) {
      console.error('Failed to check login attempts:', error);
    }
  }

  async logFailedLogin(email: string, reason: string, ipAddress?: string) {
    await this.logSecurityEvent({
      type: 'failed_login',
      severity: 'medium',
      user_email: email,
      ip_address: ipAddress,
      details: `Failed login attempt: ${reason}`,
      metadata: { reason },
    });

    await this.checkFailedLoginAttempts(email, ipAddress);
  }

  async logUnauthorizedAccess(userId: string, email: string, resource: string, action: string) {
    await this.logSecurityEvent({
      type: 'unauthorized_access',
      severity: 'high',
      user_id: userId,
      user_email: email,
      details: `Unauthorized ${action} attempt on ${resource}`,
      metadata: { resource, action },
    });
  }

  async logPermissionViolation(userId: string, email: string, permission: string, attemptedAction: string) {
    await this.logSecurityEvent({
      type: 'permission_violation',
      severity: 'medium',
      user_id: userId,
      user_email: email,
      details: `Attempted ${attemptedAction} without ${permission} permission`,
      metadata: { permission, attemptedAction },
    });
  }

  async logSuspiciousActivity(userId: string, email: string, activity: string) {
    await this.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      user_id: userId,
      user_email: email,
      details: activity,
      metadata: { activity_type: 'suspicious' },
    });
  }

  async logDataAccessViolation(userId: string, email: string, table: string, recordId: string) {
    await this.logSecurityEvent({
      type: 'data_access_violation',
      severity: 'high',
      user_id: userId,
      user_email: email,
      details: `Attempted to access restricted data in ${table}`,
      metadata: { table, recordId },
    });
  }

  async logRoleEscalationAttempt(userId: string, email: string, targetRole: string) {
    await this.logSecurityEvent({
      type: 'role_escalation_attempt',
      severity: 'high',
      user_id: userId,
      user_email: email,
      details: `Attempted to escalate privileges to ${targetRole}`,
      metadata: { targetRole },
    });
  }
}

export const securityService = new SecurityService();
