import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Users, MessageCircle, Mic } from 'lucide-react';

const STORAGE_KEY = 'meeting-rewards-teaser-seen-v1';

export const MeetingRewardsTeaserPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const key = `${STORAGE_KEY}:${user.id}`;
    if (localStorage.getItem(key)) return;
    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, [user?.id]);

  const dismiss = () => {
    if (user?.id) localStorage.setItem(`${STORAGE_KEY}:${user.id}`, '1');
    setOpen(false);
  };

  const goToMessages = () => {
    dismiss();
    navigate('/messages');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden p-0">
        <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-700 px-6 pt-6 pb-5 text-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="text-xs uppercase tracking-widest text-amber-200">New rewards unlocked</span>
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-2xl font-bold text-white">
              Your meetings can pay you 💬☕
            </DialogTitle>
            <DialogDescription className="text-amber-100 text-sm leading-relaxed">
              Did you know you can earn <strong className="text-white">up to UGX 5,000 a day</strong> just
              by starting a departmental meeting or hosting a group call — and{' '}
              <strong className="text-white">up to UGX 3,500</strong> for attending and participating?
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3 bg-background">
          <p className="text-sm text-muted-foreground">Here's how to start earning right now:</p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Users className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
              <span>Open <strong>Messages</strong> and tap the group-call icon to host a meeting.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Mic className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
              <span>Use a clear title like <em>"Quality Team Standup"</em> so it counts as departmental.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MessageCircle className="h-4 w-4 mt-0.5 text-amber-700 shrink-0" />
              <span>Stay engaged — chat, react, share screen. Real participation earns more.</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            Rewards land in your wallet automatically. Fair-use daily and monthly limits apply.
          </p>
        </div>

        <DialogFooter className="px-6 pb-5 gap-2 sm:gap-2">
          <Button variant="ghost" onClick={dismiss}>Maybe later</Button>
          <Button onClick={goToMessages} className="bg-amber-800 hover:bg-amber-900 text-amber-50">
            Try it now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingRewardsTeaserPopup;