import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fixDenisAccountFinal } from '@/utils/fixDenisAccountFinal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const DenisAccountFixer = () => {
  const [isFixingDenis, setIsFixingDenis] = useState(false);
  const [isFixingTimothy, setIsFixingTimothy] = useState(false);
  const [isFixingNicholus, setIsFixingNicholus] = useState(false);
  const { toast } = useToast();

  const handleFixDenisAccount = async () => {
    setIsFixingDenis(true);
    try {
      await fixDenisAccountFinal();
      toast({
        title: "Success",
        description: "Denis account has been fixed",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to fix Denis account:', error);
      toast({
        title: "Error",
        description: "Failed to fix Denis account",
        variant: "destructive"
      });
    } finally {
      setIsFixingDenis(false);
    }
  };

  const handleFixTimothyAccount = async () => {
    setIsFixingTimothy(true);
    try {
      console.log('🔧 Creating Timothy\'s auth account...');
      
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          employeeData: {
            email: 'tatwanzire@gmail.com',
            password: 'TimothyFarmFlow2025!',
            name: 'Artwanzire Timothy',
            role: 'Supervisor'
          },
          linkExisting: true
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Timothy's auth account created and linked successfully`,
          variant: "default"
        });
        console.log('✅ Timothy account created:', data);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Failed to create Timothy account:', error);
      toast({
        title: "Error",
        description: `Failed to create Timothy's account: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsFixingTimothy(false);
    }
  };

  const handleFixNicholusAccount = async () => {
    setIsFixingNicholus(true);
    try {
      console.log('🔗 Linking Nicholus to existing auth account...');
      
      // Nicholus already has an auth account, we just need to link it to his employee record
      const authUserId = '24edb593-8527-4ced-8225-f5df0d209ccf';
      
      const { data, error } = await supabase
        .from('employees')
        .update({ auth_user_id: authUserId })
        .eq('email', 'nicholusscottlangz@gmail.com')
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Nicholus's employee record linked to auth account successfully`,
        variant: "default"
      });
      console.log('✅ Nicholus account linked:', data);
    } catch (error) {
      console.error('Failed to link Nicholus account:', error);
      toast({
        title: "Error",
        description: `Failed to link Nicholus's account: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsFixingNicholus(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin: Fix Denis Account</CardTitle>
          <CardDescription>
            Click to fix Denis's authentication issue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleFixDenisAccount}
            disabled={isFixingDenis}
            className="w-full"
          >
            {isFixingDenis ? 'Fixing Account...' : 'Fix Denis Account'}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin: Create Timothy's Auth Account</CardTitle>
          <CardDescription>
            Create Supabase auth account for Timothy and link to existing employee record
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleFixTimothyAccount}
            disabled={isFixingTimothy}
            className="w-full"
          >
            {isFixingTimothy ? 'Creating Account...' : 'Create Timothy Auth Account'}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin: Link Nicholus Account</CardTitle>
          <CardDescription>
            Link existing Supabase auth account to Nicholus's employee record
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleFixNicholusAccount}
            disabled={isFixingNicholus}
            className="w-full"
          >
            {isFixingNicholus ? 'Linking Account...' : 'Link Nicholus Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};