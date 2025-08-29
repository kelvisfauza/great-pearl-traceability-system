import { supabase } from '@/integrations/supabase/client';

export const createDenisSupabaseAccount = async () => {
  try {
    console.log('Creating Denis Supabase account...');
    
    // Create user account through edge function
    const { data: userData, error: userError } = await supabase.functions.invoke('create-user', {
      body: {
        email: 'bwambaledenis8@gmail.com',
        password: 'DenisSecure123!',
        name: 'bwambale denis',
        phone: '0781121639',
        position: 'Staff',
        department: 'General',
        role: 'User',
        permissions: ['Reports', 'Store Management', 'Data Analysis'],
        salary: 500000
      }
    });

    if (userError) {
      console.error('Error creating Denis user:', userError);
      throw userError;
    }

    console.log('✅ Denis user created:', userData);

    // Now create his account with funds
    const { data: accountData, error: accountError } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userData.user.id,
        current_balance: 75000,
        total_earned: 75000,
        salary_approved: 0
      })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating Denis account:', accountError);
      throw accountError;
    }

    console.log('✅ Denis account created with funds:', accountData);

    // Add activity records
    const activities = [
      // Login rewards (30 days × 500)
      ...Array.from({length: 30}, (_, i) => ({
        user_id: userData.user.id,
        activity_type: 'login',
        activity_date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 500
      })),
      // Data entry (100 × 200)
      ...Array.from({length: 100}, (_, i) => ({
        user_id: userData.user.id,
        activity_type: 'data_entry',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 200
      })),
      // Form submissions (45 × 300)
      ...Array.from({length: 45}, (_, i) => ({
        user_id: userData.user.id,
        activity_type: 'form_submission',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 300
      })),
      // Report generation (20 × 400)
      ...Array.from({length: 20}, (_, i) => ({
        user_id: userData.user.id,
        activity_type: 'report_generation',
        activity_date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reward_amount: 400
      }))
    ];

    // Insert activities in batches
    const batchSize = 50;
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize);
      const { error: activityError } = await supabase
        .from('user_activity')
        .insert(batch);

      if (activityError) {
        console.error('Error inserting activity batch:', activityError);
      }
    }

    console.log('✅ Denis activity records created');

    return {
      success: true,
      message: 'Denis account created successfully with 75,000 UGX in rewards',
      balance: 75000,
      userId: userData.user.id
    };
    
  } catch (error) {
    console.error('❌ Error creating Denis account:', error);
    throw error;
  }
};

// Auto-execute to create Denis account
createDenisSupabaseAccount().then((result) => {
  console.log('Denis account setup complete:', result);
}).catch(error => {
  console.error('Failed to setup Denis account:', error);
});