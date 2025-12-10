import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify the caller is an authenticated Super Admin
async function verifySuperAdminCaller(req: Request, supabaseAdmin: any): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return { isAdmin: false, error: 'Missing authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  
  if (userError || !user) {
    return { isAdmin: false, error: 'Invalid or expired token' }
  }

  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (empError || !employee) {
    return { isAdmin: false, error: 'Employee record not found' }
  }

  // Only Super Admin can perform cleanup operations
  if (employee.role !== 'Super Admin') {
    return { isAdmin: false, error: 'Insufficient permissions - Super Admin role required' }
  }

  return { isAdmin: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting user cleanup process...');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify caller is Super Admin
    const { isAdmin, error: authError } = await verifySuperAdminCaller(req, supabaseAdmin)
    if (!isAdmin) {
      console.error('🚫 Authorization failed:', authError)
      return new Response(
        JSON.stringify({ success: false, error: authError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const MAIN_ACCOUNT_EMAIL = 'nicholusscottlangz@gmail.com';

    console.log(`📋 Main account to keep: ${MAIN_ACCOUNT_EMAIL}`);

    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`👥 Found ${users.length} total users`);

    const usersToDelete = users.filter(user => user.email !== MAIN_ACCOUNT_EMAIL);
    
    console.log(`🗑️ Users to delete: ${usersToDelete.length}`);

    let deletedCount = 0;
    let errors: string[] = [];

    for (const user of usersToDelete) {
      try {
        console.log(`🔄 Deleting user: ${user.email} (${user.id})`);

        const { error: employeeDeleteError } = await supabaseAdmin
          .from('employees')
          .delete()
          .eq('auth_user_id', user.id);

        if (employeeDeleteError) {
          console.error(`❌ Error deleting employee record for ${user.email}:`, employeeDeleteError);
          errors.push(`Employee deletion failed for ${user.email}: ${employeeDeleteError.message}`);
        } else {
          console.log(`✅ Deleted employee record for ${user.email}`);
        }

        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (authDeleteError) {
          console.error(`❌ Error deleting auth user ${user.email}:`, authDeleteError);
          errors.push(`Auth deletion failed for ${user.email}: ${authDeleteError.message}`);
        } else {
          console.log(`✅ Deleted auth user: ${user.email}`);
          deletedCount++;
        }

      } catch (error) {
        console.error(`❌ Unexpected error deleting user ${user.email}:`, error);
        errors.push(`Unexpected error for ${user.email}: ${error.message}`);
      }
    }

    console.log('🧹 Cleaning up orphaned employee records...');
    
    const { error: orphanedCleanupError } = await supabaseAdmin
      .from('employees')
      .delete()
      .neq('email', MAIN_ACCOUNT_EMAIL);

    if (orphanedCleanupError) {
      console.error('❌ Error cleaning up orphaned employees:', orphanedCleanupError);
      errors.push(`Orphaned cleanup failed: ${orphanedCleanupError.message}`);
    } else {
      console.log('✅ Cleaned up orphaned employee records');
    }

    const result = {
      success: true,
      message: `User cleanup completed. Deleted ${deletedCount} users, kept main account: ${MAIN_ACCOUNT_EMAIL}`,
      deletedCount,
      mainAccountKept: MAIN_ACCOUNT_EMAIL,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('🎉 Cleanup completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('💥 Critical error during cleanup:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to cleanup users',
      error: error.message
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  }
});
