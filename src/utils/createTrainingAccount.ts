import { supabase } from "@/integrations/supabase/client";

export const createTrainingAccount = async () => {
  try {
    console.log('Creating training account...');
    
    const { data, error } = await supabase.functions.invoke('create-training-user', {
      body: {}
    });

    if (error) {
      console.error('Error creating training account:', error);
      return { error: error.message };
    }

    console.log('Training account created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { error: 'Failed to create training account' };
  }
};