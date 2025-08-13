import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  "Data Analysis",
  "Milling",
  "All Departments"
];

export default function AnnouncementDialog({ trigger }: AnnouncementDialogProps) {
  const { createAnnouncement } = useNotifications();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [submitting, setSubmitting] = useState(false);

  const handleDepartmentChange = (dept: string, checked: boolean) => {
    if (dept === "All Departments") {
      if (checked) {
        setSelectedDepartments(departments.filter(d => d !== "All Departments"));
      } else {
        setSelectedDepartments([]);
      }
    } else {
      if (checked) {
        setSelectedDepartments(prev => [...prev, dept]);
      } else {
        setSelectedDepartments(prev => prev.filter(d => d !== dept));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee?.department) {
      toast({ title: "Not allowed", description: "Sign in to send announcements.", variant: "destructive" });
      return;
    }
    if (!title.trim() || !message.trim() || selectedDepartments.length === 0) {
      toast({ title: "Missing info", description: "Please fill title, message and select at least one department." });
      return;
    }
    try {
      setSubmitting(true);
      
      // Send single announcement to all selected departments
      console.log('Sending announcement to departments:', selectedDepartments);
      await createAnnouncement(
        title.trim(),
        message.trim(),
        employee.department,
        selectedDepartments,
        undefined,
        priority
      );
      
      toast({ 
        title: "Announcement sent", 
        description: `Sent to ${selectedDepartments.length} department${selectedDepartments.length > 1 ? 's' : ''}` 
      });
      setOpen(false);
      setTitle("");
      setMessage("");
      setSelectedDepartments([]);
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
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label>Target departments</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {departments.map((dept) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={dept}
                    checked={dept === "All Departments" ? 
                      selectedDepartments.length === departments.length - 1 : 
                      selectedDepartments.includes(dept)
                    }
                    onCheckedChange={(checked) => handleDepartmentChange(dept, checked as boolean)}
                  />
                  <Label htmlFor={dept} className="text-sm cursor-pointer">
                    {dept}
                  </Label>
                </div>
              ))}
            </div>
            {selectedDepartments.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedDepartments.join(", ")}
              </p>
            )}
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
