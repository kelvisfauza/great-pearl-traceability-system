import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, Video, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupCall, GROUP_CALL_SOFT_LIMIT, GROUP_CALL_HARD_LIMIT } from '@/contexts/GroupCallContext';

interface DirectoryUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  department?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  presetInvitees?: { userId: string; name: string }[];
  title?: string;
  conversationId?: string | null;
}

const NewGroupCallDialog = ({ open, onClose, presetInvitees, title, conversationId }: Props) => {
  const { user } = useAuth();
  const { startGroupCall } = useGroupCall();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, { userId: string; name: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [groupTitle, setGroupTitle] = useState(title || '');

  useEffect(() => {
    if (!open) return;
    setSelected(new Map((presetInvitees || []).map(i => [i.userId, i])));
    setGroupTitle(title || '');
  }, [open, presetInvitees, title]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).rpc('get_employee_directory');
        setUsers((data || []).filter((u: any) => u.auth_user_id && u.auth_user_id !== user?.id));
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggle = (u: DirectoryUser) => {
    setSelected(prev => {
      const next = new Map(prev);
      if (next.has(u.auth_user_id)) next.delete(u.auth_user_id);
      else next.set(u.auth_user_id, { userId: u.auth_user_id, name: u.name });
      return next;
    });
  };

  const start = async (type: 'audio' | 'video') => {
    setStarting(true);
    try {
      await startGroupCall({
        type,
        invitees: Array.from(selected.values()),
        title: groupTitle || undefined,
        conversationId: conversationId || null,
      });
      onClose();
    } finally {
      setStarting(false);
    }
  };

  const count = selected.size + 1; // include me
  const overSoft = count > GROUP_CALL_SOFT_LIMIT;
  const overHard = count > GROUP_CALL_HARD_LIMIT;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New group call</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Call name (optional)" value={groupTitle} onChange={e => setGroupTitle(e.target.value)} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {overSoft && (
            <div className="flex items-start gap-2 text-xs p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {overHard
                  ? `Maximum is ${GROUP_CALL_HARD_LIMIT} people per call. Remove some to continue.`
                  : `Mesh group calls work best up to ${GROUP_CALL_SOFT_LIMIT}. Above that, expect choppy video — voice-only is more reliable.`}
              </span>
            </div>
          )}

          <ScrollArea className="h-72 border rounded">
            <div className="divide-y">
              {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
              {!loading && filtered.length === 0 && <div className="p-3 text-sm text-muted-foreground">No people found.</div>}
              {!loading && filtered.map(u => {
                const checked = selected.has(u.auth_user_id);
                return (
                  <label key={u.id} className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(u)} />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{u.name?.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.department || u.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">{count} participant{count === 1 ? '' : 's'} (including you)</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={starting}>Cancel</Button>
          <Button variant="secondary" onClick={() => start('audio')} disabled={starting || selected.size === 0 || overHard}>
            <Phone className="h-4 w-4 mr-2" /> Voice
          </Button>
          <Button onClick={() => start('video')} disabled={starting || selected.size === 0 || overHard}>
            <Video className="h-4 w-4 mr-2" /> Video
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupCallDialog;