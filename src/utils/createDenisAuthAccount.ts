import { supabase } from '@/integrations/supabase/client';

export const createDenisAuthAccount = async () => {
  try {
    console.log('Creating Supabase auth account for Denis...');
    
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        userData: {
          name: 'bwambale denis',
          role: 'User'
        }
      }
    });

    if (error) {
      console.error('Error creating Denis auth account:', error);
      throw error;
    }

    console.log('✅ Denis auth account created successfully:', data);
    
    // Update the employee record with the auth_user_id
    if (data?.user?.id) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_user_id: data.user.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (updateError) {
        console.error('Error updating employee record:', updateError);
        throw updateError;
      }

      console.log('✅ Employee record updated with auth_user_id');
    }

    return { 
      success: true, 
      message: 'Denis can now log in with email: bwambaledenis8@gmail.com and password: Denis123!',
      authUserId: data?.user?.id
    };
  } catch (error) {
    console.error('❌ Error creating Denis auth account:', error);
    throw error;
  }
};

// Auto-execute to create Denis's auth account
createDenisAuthAccount().then((result) => {
  console.log('Denis auth account creation result:', result);
}).catch(error => {
  console.error('Failed to create Denis auth account:', error);
});