import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DirectoryUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (opts: { name: string; participantIds: string[] }) => Promise<{ id: string } | void>;
}

const PRESETS = [
  'Quality Team',
  'Finance Team',
  'Procurement Team',
  'Field Operations',
  'HR Team',
  'Management',
];

const NewGroupChatDialog = ({ open, onClose, onCreate }: Props) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setSelected(new Set());
    setSearch('');
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).rpc('get_employee_directory');
        const mapped: DirectoryUser[] = ((data as any[]) || [])
          .filter((e) => e.auth_user_id && e.auth_user_id !== user?.id)
          .map((e) => ({
            id: e.id,
            auth_user_id: e.auth_user_id,
            name: e.name,
            email: e.email,
            department: e.department,
            position: e.job_position ?? e.position ?? '',
          }));
        setUsers(mapped);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q),
    );
  }, [users, search]);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || selected.size === 0) return;
    setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), participantIds: Array.from(selected) });
      onClose();
    } catch {
      // toast already shown
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            New group chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Input
              placeholder="Group name (e.g. Quality Team)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setName(p)}
                  className="text-xs px-2 py-1 rounded-full border bg-muted hover:bg-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="h-72 border rounded">
            <div className="divide-y">
              {loading && <div className="p-3 text-sm text-muted-foreground">Loading…</div>}
              {!loading && filtered.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No people found.</div>
              )}
              {!loading &&
                filtered.map((u) => {
                  const checked = selected.has(u.auth_user_id);
                  return (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-2 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(u.auth_user_id)} />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {u.name?.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.department || u.email}
                        </p>
                      </div>
                    </label>
                  );
                })}
            </div>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">
            {selected.size + 1} member{selected.size === 0 ? '' : 's'} (including you)
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || selected.size === 0}
          >
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewGroupChatDialog;
