import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AnnouncementDialogProps {
  trigger?: React.ReactNode;
}

const departments = [
  "Operations",
  "Quality Control",
  "Production",
  "Administration",
  "Finance",
  "Sales & Marketing",
  "HR",
  "Store",
  "Reports",
  "IT",
];

export default function AnnouncementDialog({ trigger }: AnnouncementDialogProps) {
  const { createAnnouncement } = useNotifications();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetDepartment, setTargetDepartment] = useState<string>("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.department) {
      toast({ title: "Not allowed", description: "Sign in to send announcements.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !message.trim() || !targetDepartment) {
      toast({ title: "Missing info", description: "Please fill title, message and target department." });
      return;
    }
    try {
      setSubmitting(true);
      await createAnnouncement(
        title.trim(),
        message.trim(),
        employee.department,
        targetDepartment,
        undefined,
        priority
      );
      toast({ title: "Announcement sent", description: `Sent to ${targetDepartment}` });
      setOpen(false);
      setTitle("");
      setMessage("");
      setTargetDepartment("");
      setPriority("Medium");
    } catch (err) {
      console.error(err);
      toast({ title: "Failed", description: "Could not send announcement.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">New announcement</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send departmental announcement</DialogTitle>
          <DialogDescription>Target a department. Only intended recipients will see it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Pending coffee assessment" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Add more details..." rows={4} />
          </div>
          <div className="grid gap-2">
            <Label>Target department</Label>
            <Select value={targetDepartment} onValueChange={setTargetDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
