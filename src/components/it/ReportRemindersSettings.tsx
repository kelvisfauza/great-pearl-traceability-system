import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Sun, Moon, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ReportReminderSettings {
  daily_report_reminder: boolean;
  morning_report_reminder: boolean;
  analyst_report_reminder: boolean;
}

const ReportRemindersSettings = () => {
  const [settings, setSettings] = useState<ReportReminderSettings>({
    daily_report_reminder: true,
    morning_report_reminder: true,
    analyst_report_reminder: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'report_reminders')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, use defaults
          console.log('No report reminder settings found, using defaults');
        } else {
          throw error;
        }
      }

      if (data?.setting_value) {
        const value = data.setting_value as unknown as ReportReminderSettings;
        setSettings(value);
      }
    } catch (error) {
      console.error('Error fetching report reminder settings:', error);
      toast({
        title: "Error",
        description: "Failed to load report reminder settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof ReportReminderSettings, value: boolean) => {
    try {
      setSaving(true);
      const newSettings = { ...settings, [key]: value };
      
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: newSettings,
          updated_by: user?.email || 'unknown',
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'report_reminders');

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: "Settings Updated",
        description: `${key.replace(/_/g, ' ')} has been ${value ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const reminderTypes = [
    {
      key: 'daily_report_reminder' as const,
      title: 'Evening Report Reminder',
      description: 'Send SMS reminders between 6-7 PM to employees who haven\'t submitted their daily report',
      icon: Moon,
      time: '6:00 PM - 7:00 PM EAT'
    },
    {
      key: 'morning_report_reminder' as const,
      title: 'Morning Missed Report Reminder',
      description: 'Send SMS reminders between 7-10 AM to employees who missed yesterday\'s report',
      icon: Sun,
      time: '7:00 AM - 10:00 AM EAT'
    },
    {
      key: 'analyst_report_reminder' as const,
      title: 'Analyst Market Report Reminder',
      description: 'Send SMS reminders after 7 PM to data analysts to create the daily market report',
      icon: FileText,
      time: 'After 7:00 PM EAT'
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Report Reminder Settings
            </CardTitle>
            <CardDescription>
              Control automated SMS reminders sent to employees for daily reports
            </CardDescription>
          </div>
          <Button onClick={fetchSettings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {reminderTypes.map((reminder) => {
          const Icon = reminder.icon;
          const isEnabled = settings[reminder.key];
          
          return (
            <div
              key={reminder.key}
              className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={reminder.key} className="font-medium cursor-pointer">
                      {reminder.title}
                    </Label>
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {reminder.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {reminder.time}
                  </div>
                </div>
              </div>
              <Switch
                id={reminder.key}
                checked={isEnabled}
                onCheckedChange={(checked) => updateSetting(reminder.key, checked)}
                disabled={saving}
              />
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Note: These settings control whether automated SMS reminders are sent. 
            Disabling a reminder will stop all related SMS notifications system-wide.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportRemindersSettings;
