import { supabase } from '@/integrations/supabase/client';

export const createDenisWithEdgeFunction = async () => {
  try {
    console.log('Using create-user edge function for Denis...');
    
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        userData: {
          name: 'bwambale denis',
          role: 'User',
          position: 'Staff',
          department: 'General',
          permissions: ['Reports', 'Store Management', 'Data Analysis'],
          salary: 500000,
          phone: '0781121639'
        }
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    console.log('✅ Denis account created via edge function:', data);
    return {
      success: true,
      message: 'Denis account created successfully via edge function',
      data
    };
    
  } catch (error) {
    console.error('❌ Error using edge function for Denis:', error);
    throw error;
  }
};

// Auto-execute
createDenisWithEdgeFunction().then((result) => {
  console.log('Denis edge function result:', result);
}).catch(error => {
  console.error('Failed to create Denis via edge function:', error);
});