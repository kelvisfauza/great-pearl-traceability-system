import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';

const REMINDER_KEY = 'attendance_reminder_shown';

const AttendanceReminder = () => {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user?.email || checked) return;

    // Only show once per session per day
    const today = format(new Date(), 'yyyy-MM-dd');
    const shownKey = `${REMINDER_KEY}_${today}`;
    if (sessionStorage.getItem(shownKey)) {
      setChecked(true);
      return;
    }

    const checkAttendance = async () => {
      // Check if user has signed in today in attendance_time_records
      const { data } = await supabase
        .from('attendance_time_records')
        .select('id, arrival_time')
        .eq('employee_email', user.email)
        .eq('record_date', today)
        .maybeSingle();

      sessionStorage.setItem(shownKey, 'true');
      setChecked(true);

      if (!data?.arrival_time) {
        toast('Have you signed in today?', {
          description: 'Please sign in via the attendance system for proper records.',
          duration: 5000,
          icon: <Clock className="h-5 w-5 text-orange-500" />,
          action: {
            label: 'Sign In Now',
            onClick: () => {
              window.location.href = '/it';
            },
          },
        });
      }
    };

    // Small delay to let the dashboard load first
    const timer = setTimeout(checkAttendance, 1500);
    return () => clearTimeout(timer);
  }, [user?.email, checked]);

  return null;
};

export default AttendanceReminder;
