import { supabase } from '@/integrations/supabase/client';

export const createDenisAccount = async () => {
  try {
    console.log('Creating Denis account with proper authentication...');
    
    // Create Denis's user account via edge function
    const { data: createResult, error: createError } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'bwambaledenis8@gmail.com',
        password: 'Denis123!',
        userData: {
          name: 'bwambale denis',
          phone: '0781121639',
          position: 'Staff',
          department: 'General',
          role: 'User',
          permissions: ['Reports', 'Store Management', 'Data Analysis'],
          salary: 500000
        }
      }
    });

    if (createError) {
      console.error('Error creating Denis account:', createError);
      return { success: false, error: createError };
    }

    console.log('Denis account created successfully:', createResult);

    // Get the created user ID
    const userId = createResult?.user?.id;
    
    if (!userId) {
      console.error('No user ID returned from account creation');
      return { success: false, error: 'No user ID returned' };
    }

    // Add funds and activity to Denis's account
    const { error: fundsError } = await supabase
      .from('user_accounts')
      .upsert({
        user_id: userId,
        current_balance: 75000,
        total_earned: 75000,
        salary_approved: 0
      });

    if (fundsError) {
      console.error('Error adding funds:', fundsError);
      return { success: false, error: fundsError };
    }

    // Add historical activity records
    const activities = [];

    // Login activities (30 days)
    for (let i = 1; i <= 30; i++) {
      activities.push({
        user_id: userId,
        activity_type: 'login',
        activity_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 500
      });
    }

    // Data entry activities (100 entries)
    for (let i = 1; i <= 100; i++) {
      activities.push({
        user_id: userId,
        activity_type: 'data_entry',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 200
      });
    }

    // Form submissions (45 entries)
    for (let i = 1; i <= 45; i++) {
      activities.push({
        user_id: userId,
        activity_type: 'form_submission',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 300
      });
    }

    // Report generation (20 entries)
    for (let i = 1; i <= 20; i++) {
      activities.push({
        user_id: userId,
        activity_type: 'report_generation',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 400
      });
    }

    // Insert activities in batches
    const batchSize = 50;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      const { error: activityError } = await supabase
        .from('user_activity')
        .insert(batch);

      if (activityError) {
        console.error('Error adding activity batch:', activityError);
      }
    }

    console.log('✅ Denis account fully set up with 75,000 UGX and activity history');
    return { 
      success: true, 
      message: 'Denis account created with 75,000 UGX balance and full activity history',
      userId 
    };

  } catch (error) {
    console.error('❌ Error creating Denis account:', error);
    throw error;
  }
};

// Auto-execute to create Denis account immediately
createDenisAccount().then((result) => {
  if (result.success) {
    console.log('Denis account successfully created:', result.message);
  }
}).catch(error => {
  console.error('Failed to create Denis account:', error);
});