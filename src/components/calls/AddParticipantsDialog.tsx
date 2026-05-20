import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupCall } from '@/contexts/GroupCallContext';

interface DirectoryUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  department?: string;
}

const AddParticipantsDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const { participants, addParticipants } = useGroupCall();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, { userId: string; name: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) { setSelected(new Map()); setSearch(''); return; }
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).rpc('get_employee_directory');
        setUsers((data || []).filter((u: any) =>
          u.auth_user_id && u.auth_user_id !== user?.id && !participants.has(u.auth_user_id)
        ));
      } finally { setLoading(false); }
    })();
  }, [open, participants, user?.id]);

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

  const confirm = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await addParticipants(Array.from(selected.values()));
      onClose();
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add people to call</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ScrollArea className="h-72 border rounded">
            <div className="divide-y">
              {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
              {!loading && filtered.length === 0 && <div className="p-3 text-sm text-muted-foreground">No people to add.</div>}
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
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={confirm} disabled={busy || selected.size === 0}>
            <UserPlus className="h-4 w-4 mr-2" /> Invite {selected.size || ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddParticipantsDialog;