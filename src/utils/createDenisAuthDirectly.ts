import { supabase } from '@/integrations/supabase/client';

export const createDenisAuthDirectly = async () => {
  try {
    console.log('Creating Denis auth account directly...');
    
    // Try to sign up Denis directly
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'bwambaledenis8@gmail.com',
      password: 'Denis123!',
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: 'bwambale denis',
          role: 'User'
        }
      }
    });

    if (signUpError) {
      console.error('Error during signup:', signUpError);
      
      // If user already exists, try to get their info
      if (signUpError.message.includes('already registered')) {
        console.log('User already exists, trying to link...');
        
        // Sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'bwambaledenis8@gmail.com',
          password: 'Denis123!'
        });
        
        if (signInError) {
          console.error('Sign in failed:', signInError);
          throw signInError;
        }
        
        if (signInData.user) {
          // Update employee record with the user ID
          const { error: updateError } = await supabase
            .from('employees')
            .update({ auth_user_id: signInData.user.id })
            .eq('email', 'bwambaledenis8@gmail.com');
            
          if (updateError) {
            console.error('Error updating employee record:', updateError);
            throw updateError;
          }
          
          console.log('✅ Denis account linked successfully');
          await supabase.auth.signOut(); // Sign out after linking
          
          return {
            success: true,
            message: 'Denis account linked successfully',
            credentials: 'bwambaledenis8@gmail.com / Denis123!'
          };
        }
      }
      throw signUpError;
    }

    if (signUpData.user) {
      console.log('✅ Denis auth account created:', signUpData.user.id);
      
      // Update employee record with the new auth_user_id
      const { error: updateError } = await supabase
        .from('employees')
        .update({ auth_user_id: signUpData.user.id })
        .eq('email', 'bwambaledenis8@gmail.com');

      if (updateError) {
        console.error('Error updating employee record:', updateError);
        throw updateError;
      }

      console.log('✅ Employee record updated with auth_user_id');
      
      return {
        success: true,
        message: 'Denis account created successfully',
        credentials: 'bwambaledenis8@gmail.com / Denis123!',
        authUserId: signUpData.user.id
      };
    }

    throw new Error('No user data returned from signup');
    
  } catch (error) {
    console.error('❌ Error creating Denis auth account:', error);
    throw error;
  }
};

// Auto-execute to create Denis's auth account
createDenisAuthDirectly().then((result) => {
  console.log('Denis auth creation result:', result);
}).catch(error => {
  console.error('Failed to create Denis auth account:', error);
});