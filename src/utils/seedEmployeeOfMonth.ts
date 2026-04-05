import { supabase } from '@/integrations/supabase/client';

export const seedEmployeeOfTheMonth = async () => {
  const winners = [
    {
      employee_id: '3bfd4285-343d-4991-aa06-78ace1479afb',
      employee_name: 'Bwambale Denis',
      employee_email: 'bwambaledenis@greatpearlcoffee.com',
      employee_avatar_url: 'https://pudfybkyfedeggmokhco.supabase.co/storage/v1/object/public/profile_pictures/7cdf79bf-c024-4107-98a7-3d84dbf0e975-1774680215620.jpg',
      department: 'Administration',
      position: 'Staff',
      rank: 1,
      month: 3,
      year: 2026,
      reason: 'Highest task completion (394 tasks) and most overtime hours (94hrs). Unmatched productivity.',
      bonus_amount: 50000,
      bonus_awarded: false,
      is_active: true,
      created_by: 'fauzakusa@greatpearlcoffee.com',
    },
    {
      employee_id: 'de39d5d6-2b0f-4d7b-9833-7fee52b09ae1',
      employee_name: 'Morjalia Jadens',
      employee_email: 'bwambalemorjalia@greatpearlcoffee.com',
      employee_avatar_url: 'https://pudfybkyfedeggmokhco.supabase.co/storage/v1/object/public/profile_pictures/60fa7376-53ee-4804-9b6c-0eefccd3fc9c-1774855399533.jpg',
      department: 'Quality Control',
      position: 'Staff',
      rank: 2,
      month: 3,
      year: 2026,
      reason: 'Most reliable attendance (9 present days) with strong overtime commitment. Consistent and dependable.',
      bonus_amount: 50000,
      bonus_awarded: false,
      is_active: true,
      created_by: 'fauzakusa@greatpearlcoffee.com',
    },
  ];

  // Insert EOTM records
  const { error: eotmError } = await supabase
    .from('employee_of_the_month')
    .upsert(winners, { onConflict: 'employee_id,month,year' });

  if (eotmError) {
    console.error('EOTM insert error:', eotmError);
    throw eotmError;
  }

  // Insert bonus records
  for (const w of winners) {
    await supabase.from('bonuses').insert({
      employee_id: w.employee_id,
      employee_email: w.employee_email,
      employee_name: w.employee_name,
      amount: 50000,
      reason: `Employee of the Month - March 2026 (#${w.rank} Rank)`,
      status: 'allocated',
      allocated_by: 'fauzakusa@greatpearlcoffee.com',
    });
  }

  // Send test emails to kelvisfauza@gmail.com
  for (const w of winners) {
    await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'employee-of-the-month',
        recipientEmail: 'kelvisfauza@gmail.com',
        idempotencyKey: `eotm-test-${w.rank}-20260405`,
        templateData: {
          employeeName: w.employee_name,
          rank: String(w.rank),
          month: 'March',
          year: '2026',
          reason: w.reason,
          bonusAmount: '50,000',
          department: w.department,
          avatarUrl: w.employee_avatar_url,
        },
      },
    });
  }

  return winners;
};
