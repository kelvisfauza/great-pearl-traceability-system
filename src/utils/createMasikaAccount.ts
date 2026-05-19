import { supabase } from '@/integrations/supabase/client';

/**
 * Creates an auth login for Masika Recheal and links it to her existing
 * employee record (id: 143e74f9-a5d6-49ad-9e75-7771009453a1).
 *
 * Run from the browser console while logged in as Super Admin / Administrator:
 *   import('@/utils/createMasikaAccount').then(m => m.createMasikaAccount());
 */
export const createMasikaAccount = async () => {
  const email = 'masikarecheal@greatpearlcoffee.com';
  const password = 'Masika20';

  console.log('🔧 Creating auth account for Masika Recheal...');

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      linkExisting: true,
      employeeData: {
        name: 'Masika Recheal',
        email,
        password,
        phone: '0775366265',
        position: 'Staff',
        department: 'General',
        role: 'User',
        salary: 0,
        permissions: [],
      },
    },
  });

  if (error) {
    console.error('❌ Error:', error);
    alert(`❌ Failed: ${error.message}`);
    return { success: false, error };
  }

  if (!data?.success) {
    console.error('❌ Edge function returned failure:', data);
    alert(`❌ Failed: ${data?.error || 'Unknown error'}`);
    return { success: false, data };
  }

  console.log('✅ Done:', data);
  alert(
    `✅ Masika Recheal can now log in.\n\nEmail: ${email}\nPassword: ${password}\n\nLinked to existing employee record.`
  );
  return { success: true, data };
};

// Expose globally for easy console run
if (typeof window !== 'undefined') {
  (window as any).createMasikaAccount = createMasikaAccount;
}
