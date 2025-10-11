import React, { useState } from 'react';
import Layout from '@/components/Layout';
import UserPermissionsList from '@/components/admin/UserPermissionsList';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const PermissionManagement = () => {
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);

  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  const handleCreateKusaAccount = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: {
          email: 'kelviskusa@gmail.com',
          employeeId: 'ba816db1-ad13-486e-8754-17a6abd11532'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Auth account created successfully!', {
          description: `Temporary password: ${data.tempPassword}`
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create auth account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout title="Permission Management" subtitle="Manage user roles and permissions">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button 
            onClick={handleCreateKusaAccount}
            disabled={creating}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {creating ? 'Creating...' : 'Create Kusa Auth Account'}
          </Button>
        </div>
        <UserPermissionsList />
      </div>
    </Layout>
  );
};

export default PermissionManagement;