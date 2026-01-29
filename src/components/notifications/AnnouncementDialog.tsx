import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { MessageSquare } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [sendSms, setSendSms] = useState(false);
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
      
      // Create announcement record for tracking
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          title: title.trim(),
          message: message.trim(),
          priority: priority.toLowerCase(),
          target_departments: selectedDepartments,
          target_roles: [],
          send_sms: sendSms,
          created_by: employee.name || employee.email,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Send the announcement via edge function if SMS is requested
      if (sendSms && announcement) {
        console.log('📤 Calling send-company-announcement edge function with ID:', announcement.id);
        const { error: sendError } = await supabase.functions.invoke('send-company-announcement', {
          body: { announcementId: announcement.id }
        });
        
        if (sendError) {
          console.error('❌ SMS sending failed:', sendError);
          toast({
            title: "SMS Sending Failed",
            description: `Could not send SMS: ${sendError.message || 'Unknown error'}`,
            variant: "destructive"
          });
          // Continue with regular notification even if SMS fails
        } else {
          console.log('✅ SMS edge function called successfully');
        }
      }
      
      // Send regular in-app notifications - create directly in notifications table
      console.log('Sending announcement to departments:', selectedDepartments);
      
      // Get all employees from targeted departments
      const { data: targetEmployees, error: empError } = await supabase
        .from('employees')
        .select('id, department')
        .in('department', selectedDepartments)
        .eq('status', 'Active');

      if (empError) {
        console.error('Error fetching target employees:', empError);
      } else if (targetEmployees && targetEmployees.length > 0) {
        // Create a notification for each targeted employee
        const notifications = targetEmployees.map(emp => ({
          type: 'announcement',
          title: title.trim(),
          message: message.trim(),
          priority: priority.toLowerCase(),
          target_user_id: emp.id,
          target_department: emp.department,
          is_read: false
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating notifications:', notifError);
        } else {
          console.log(`✅ Created ${notifications.length} in-app notifications`);
        }
      }
      
      toast({ 
        title: "Announcement sent", 
        description: `Sent to ${selectedDepartments.length} department${selectedDepartments.length > 1 ? 's' : ''}${sendSms ? ' with SMS alerts' : ''}` 
      });
      setOpen(false);
      setTitle("");
      setMessage("");
      setSelectedDepartments([]);
      setPriority("Medium");
      setSendSms(false);
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
          <DialogTitle>Send Company Announcement</DialogTitle>
          <DialogDescription>Send notifications to employees with optional SMS alerts</DialogDescription>
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
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Normal</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Separator />
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="send_sms"
              checked={sendSms}
              onCheckedChange={(checked) => setSendSms(!!checked)}
            />
            <Label htmlFor="send_sms" className="flex items-center gap-2 cursor-pointer">
              <MessageSquare className="h-4 w-4" />
              Also send SMS notifications to all employees
            </Label>
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
