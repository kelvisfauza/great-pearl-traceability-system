import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SuperAdminCreator = () => {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    department: 'Administration',
    position: 'System Administrator',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      if (!formData.email || !formData.password || !formData.name) {
        toast({
          title: "Validation Error",
          description: "Email, password, and name are required",
          variant: "destructive"
        });
        return;
      }

      if (formData.password.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters",
          variant: "destructive"
        });
        return;
      }

      console.log('Creating Super Admin account...');

      // Call edge function to create admin user with email confirmation bypassed
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setCreated(true);
        toast({
          title: "Success",
          description: "Super Admin account created successfully with email pre-verified"
        });

        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          department: 'Administration',
          position: 'System Administrator',
          phone: ''
        });
      } else {
        throw new Error(data.error || 'Failed to create admin account');
      }

    } catch (error) {
      console.error('Error creating Super Admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Super Admin account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Super Admin Created
          </CardTitle>
          <CardDescription>
            The Super Admin account has been created and email verified automatically.
            They can log in immediately without email confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setCreated(false)} className="w-full">
            Create Another Admin
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Create Super Admin Account
        </CardTitle>
        <CardDescription>
          Create a Super Admin account with email verification automatically bypassed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertDescription>
            <strong>Note:</strong> Super Admin accounts are created with email pre-verified.
            They can log in immediately without email confirmation.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@farmflow.ug"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min 8 characters"
              disabled={loading}
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Administration"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="System Administrator"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+256..."
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Super Admin
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SuperAdminCreator;