import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  trigger: React.ReactNode;
}

const ADMIN_ROLES = ["Administrator", "Super Admin", "Managing Director", "Admin"];

const PRESET_DURATIONS = [
  { label: "5 minutes", minutes: 5 },
  { label: "30 minutes", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "4 hours", minutes: 240 },
  { label: "12 hours", minutes: 720 },
  { label: "1 day", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
];

const MarqueeAnnouncementDialog = ({ trigger }: Props) => {
  const { employee } = useAuth();
  const isAdmin = employee?.role && ADMIN_ROLES.includes(employee.role);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"info" | "warning" | "critical">("info");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState<any[]>([]);

  const loadActive = async () => {
    const { data } = await supabase
      .from("marquee_announcements" as any)
      .select("id, message, priority, expires_at, created_at, created_by_name")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setActive((data as any) || []);
  };

  useEffect(() => {
    if (open) loadActive();
  }, [open]);

  if (!isAdmin) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSubmitting(true);
    const expires = new Date(Date.now() + durationMinutes * 60_000).toISOString();
    const { error } = await supabase.from("marquee_announcements" as any).insert({
      message: message.trim(),
      priority,
      expires_at: expires,
      is_active: true,
      created_by_name: employee?.name || null,
      created_by_email: employee?.email || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to broadcast: " + error.message);
      return;
    }
    toast.success("Announcement is now scrolling on every user's screen");
    setMessage("");
    setPriority("info");
    setDurationMinutes(60);
    loadActive();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("marquee_announcements" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove: " + error.message);
      return;
    }
    toast.success("Announcement removed");
    loadActive();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Broadcast scrolling announcement
          </DialogTitle>
          <DialogDescription>
            This message will scroll across the top of every signed-in user's screen until it expires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. System maintenance from 7 PM to 8 PM tonight"
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">{message.length}/500</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (blue)</SelectItem>
                  <SelectItem value="warning">Warning (amber)</SelectItem>
                  <SelectItem value="critical">Critical (red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disappears after</Label>
              <Select value={String(durationMinutes)} onValueChange={(v) => setDurationMinutes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESET_DURATIONS.map((d) => (
                    <SelectItem key={d.minutes} value={String(d.minutes)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {active.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs uppercase text-muted-foreground">Currently broadcasting</Label>
              <div className="space-y-2 max-h-48 overflow-auto">
                {active.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 p-2 rounded border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{a.priority}</Badge>
                        <span className="text-xs text-muted-foreground">
                          expires {formatDistanceToNow(new Date(a.expires_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm break-words">{a.message}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(a.id)} title="Remove now">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Broadcasting..." : "Broadcast now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarqueeAnnouncementDialog;