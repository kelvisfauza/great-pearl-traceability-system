import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupCall } from '@/contexts/GroupCallContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, X, Calendar } from 'lucide-react';

interface ActiveMeeting {
  meeting_id: string;
  kind: string;
  title: string;
  department: string | null;
  call_id: string;
  started_at: string;
  attendance_status: string;
}

const POLL_MS = 30_000;

const ScheduledMeetingPrompt = () => {
  const { user } = useAuth();
  const { active, incoming, rejoinGroupCall } = useGroupCall();
  const [meeting, setMeeting] = useState<ActiveMeeting | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const check = async () => {
      if (cancelled || active || incoming) return;
      try {
        const { data, error } = await (supabase as any).rpc(
          'get_active_scheduled_meeting_for_user',
          { _user_id: user.id }
        );
        if (error || cancelled) return;
        const m = Array.isArray(data) ? data[0] : null;
        setMeeting(m || null);
      } catch { /* silent */ }
    };

    check();
    const id = window.setInterval(check, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [user?.id, active, incoming]);

  if (!meeting || active || incoming) return null;

  const handleJoin = async () => {
    if (!meeting) return;
    setBusy(true);
    try {
      await (supabase as any).rpc('record_meeting_attendance',
        { _meeting_id: meeting.meeting_id, _status: 'joined' });
      const cid = meeting.call_id;
      setMeeting(null);
      await rejoinGroupCall(cid);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!meeting) return;
    setBusy(true);
    try {
      await (supabase as any).rpc('record_meeting_attendance',
        { _meeting_id: meeting.meeting_id, _status: 'declined' });
      setMeeting(null);
    } finally {
      setBusy(false);
    }
  };

  const startedMins = Math.max(0, Math.round((Date.now() - new Date(meeting.started_at).getTime()) / 60000));

  return (
    <Dialog open={true} onOpenChange={(v) => { if (!v && !busy) handleDecline(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {meeting.title}
          </DialogTitle>
          <DialogDescription>
            {meeting.kind === 'general_monday'
              ? 'The weekly all-company Monday meeting is live.'
              : `Your ${meeting.department || ''} Tuesday departmental meeting is live.`}
            {' '}Started {startedMins} min ago.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Your attendance is automatically recorded. The call is recorded by the host for accountability.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDecline} disabled={busy}>
            <X className="h-4 w-4 mr-2" /> Decline
          </Button>
          <Button onClick={handleJoin} disabled={busy}>
            <Phone className="h-4 w-4 mr-2" /> Join meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduledMeetingPrompt;