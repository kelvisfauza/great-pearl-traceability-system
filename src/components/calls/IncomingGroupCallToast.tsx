import { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Users } from 'lucide-react';
import { useGroupCall } from '@/contexts/GroupCallContext';

const IncomingGroupCallToast = () => {
  const { incoming, acceptIncoming, declineIncoming } = useGroupCall();
  const ctxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    if (!incoming) return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      ctxRef.current = ctx;
      const playRing = () => {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0, now);
        master.gain.linearRampToValueAtTime(0.2, now + 0.05);
        master.gain.setValueAtTime(0.2, now + 1.9);
        master.gain.linearRampToValueAtTime(0, now + 2.0);
        master.connect(ctx.destination);
        [440, 480].forEach(f => {
          const osc = ctx.createOscillator();
          osc.type = 'sine'; osc.frequency.value = f;
          const g = ctx.createGain(); g.gain.value = 0.5;
          osc.connect(g).connect(master);
          osc.start(now); osc.stop(now + 2.05);
        });
      };
      const loop = () => { playRing(); const id = window.setTimeout(loop, 6000); timeoutsRef.current.push(id); };
      loop();
    } catch {}
    return () => {
      timeoutsRef.current.forEach(id => window.clearTimeout(id));
      timeoutsRef.current = [];
      try { ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
    };
  }, [incoming]);

  if (!incoming) return null;

  return (
    <Dialog open>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Incoming group {incoming.type} call</p>
            <p className="text-lg font-semibold">{incoming.hostName}</p>
            {incoming.title && <p className="text-xs text-muted-foreground">{incoming.title}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={declineIncoming} className="rounded-full h-12 px-6">
              <PhoneOff className="h-5 w-5 mr-2" /> Decline
            </Button>
            <Button onClick={acceptIncoming} className="rounded-full h-12 px-6 bg-green-600 hover:bg-green-700">
              {incoming.type === 'video' ? <Video className="h-5 w-5 mr-2" /> : <Phone className="h-5 w-5 mr-2" />}
              Accept
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingGroupCallToast;