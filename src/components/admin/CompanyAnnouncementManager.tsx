import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Megaphone, Send, Users, MessageSquare, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  target_departments: string[];
  target_roles: string[];
  send_sms: boolean;
  created_by: string;
  created_at: string;
  sent_at?: string;
  status: string;
  recipients_count: number;
  sms_sent_count: number;
}

const CompanyAnnouncementManager = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'normal',
    target_departments: [] as string[],
    target_roles: [] as string[],
    send_sms: false
  });

  const departments = ['Finance', 'HR', 'IT', 'Store', 'Quality Control', 'Procurement', 'Logistics', 'Sales', 'Data Analytics', 'Field Operations', 'Processing', 'Milling'];
  const roles = ['Administrator', 'Manager', 'Supervisor', 'Analyst', 'Officer', 'Assistant', 'User'];
  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setIsLoading(true);
    try {
      // Create announcement record
      const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({
          title: formData.title,
          message: formData.message,
          priority: formData.priority,
          target_departments: formData.target_departments,
          target_roles: formData.target_roles,
          send_sms: formData.send_sms,
          created_by: employee.name,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Send the announcement
      const { error: sendError } = await supabase.functions.invoke('send-company-announcement', {
        body: { announcementId: announcement.id }
      });

      if (sendError) throw sendError;

      toast({
        title: "Success",
        description: `Announcement "${formData.title}" sent successfully to all targeted employees`,
      });

      // Reset form
      setFormData({
        title: '',
        message: '',
        priority: 'normal',
        target_departments: [],
        target_roles: [],
        send_sms: false
      });
      setShowForm(false);
      loadAnnouncements();

    } catch (error) {
      console.error('Error sending announcement:', error);
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDepartment = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      target_departments: prev.target_departments.includes(dept)
        ? prev.target_departments.filter(d => d !== dept)
        : [...prev.target_departments, dept]
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return priorityConfig?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Company Announcements</h2>
            <p className="text-muted-foreground">Send company-wide notifications and SMS alerts</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Megaphone className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Announcement</CardTitle>
            <CardDescription>Send a message to all employees with optional SMS notification</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Announcement Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter announcement title..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={priority.color}>{priority.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message Content</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your announcement message..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Target Departments (Leave empty for all)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {departments.map((dept) => (
                      <div key={dept} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dept-${dept}`}
                          checked={formData.target_departments.includes(dept)}
                          onCheckedChange={() => toggleDepartment(dept)}
                        />
                        <Label htmlFor={`dept-${dept}`} className="text-sm">{dept}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Target Roles (Leave empty for all)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={formData.target_roles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        <Label htmlFor={`role-${role}`} className="text-sm">{role}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_sms"
                  checked={formData.send_sms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_sms: !!checked }))}
                />
                <Label htmlFor="send_sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Also send SMS notifications to all employees
                </Label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading} className="gap-2">
                  <Send className="h-4 w-4" />
                  {isLoading ? 'Sending...' : 'Send Announcement'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Announcements</CardTitle>
            <Button variant="outline" size="sm" onClick={loadAnnouncements}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements yet. Create your first company announcement above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        <Badge className={getPriorityColor(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                        <Badge variant={announcement.status === 'sent' ? 'default' : 'secondary'}>
                          {announcement.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{announcement.message}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {announcement.recipients_count} notifications
                    </div>
                    {announcement.send_sms && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {announcement.sms_sent_count} SMS sent
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {announcement.sent_at 
                        ? `Sent ${new Date(announcement.sent_at).toLocaleString()}`
                        : `Created ${new Date(announcement.created_at).toLocaleString()}`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyAnnouncementManager;