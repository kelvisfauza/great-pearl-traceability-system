import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, CheckCircle } from 'lucide-react';

const QuickUserCreation: React.FC = () => {
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const createShafik = async () => {
    setCreating(true);
    try {
      console.log('Creating Shafik in Supabase...');
      
      const shafikData = {
        name: 'Shafik Ahmed',
        email: 'shafikahmed20051@gmail.com',
        password: 'Yeda1234',
        phone: '',
        position: 'Employee',
        department: 'Operations',
        role: 'User',
        salary: 0,
        permissions: ['General Access', 'Reports', 'Store Management'],
      };

      // Use Supabase edge function to create user with auth
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { employeeData: shafikData }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast({
        title: "Success!",
        description: `Shafik Ahmed created successfully in Supabase with email: ${shafikData.email}`
      });

      console.log('✅ Shafik created successfully:', data);
      
    } catch (error: any) {
      console.error('❌ Error creating Shafik:', error);
      
      let errorMessage = "Failed to create user";
      if (error.message?.includes('already exists')) {
        errorMessage = "User with this email already exists in the system";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Quick User Creation - Shafik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            This will create Shafik Ahmed directly in Supabase with the specified credentials and permissions.
          </AlertDescription>
        </Alert>

        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Name:</strong> Shafik Ahmed</div>
            <div><strong>Email:</strong> shafikahmed20051@gmail.com</div>
            <div><strong>Password:</strong> Yeda1234</div>
            <div><strong>Role:</strong> User</div>
            <div><strong>Department:</strong> Operations</div>
            <div><strong>Position:</strong> Employee</div>
          </div>
          <div className="text-sm">
            <strong>Permissions:</strong> General Access, Reports, Store Management
          </div>
        </div>

        <Button
          onClick={createShafik}
          disabled={creating}
          className="w-full"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {creating ? 'Creating Shafik...' : 'Create Shafik in Supabase'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickUserCreation;