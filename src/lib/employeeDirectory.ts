import { supabase } from '@/integrations/supabase/client';

export interface DirectoryUser {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
  avatar_url?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mapDirectoryRows = (
  rows: any[],
  currentUserId: string | null,
  excludeUserIds: string[],
): DirectoryUser[] => {
  const excluded = new Set([currentUserId, ...excludeUserIds].filter(Boolean));
  const seen = new Set<string>();

  return (rows || [])
    .map((row) => ({
      id: String(row.id),
      auth_user_id: String(row.auth_user_id || ''),
      name: String(row.name || '').trim(),
      email: String(row.email || '').trim().toLowerCase(),
      department: row.department || '',
      position: row.job_position ?? row.position ?? '',
      avatar_url: row.avatar_url || undefined,
    }))
    .filter((row) => row.auth_user_id && !excluded.has(row.auth_user_id))
    .filter((row) => {
      if (seen.has(row.auth_user_id)) return false;
      seen.add(row.auth_user_id);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

const resolveCurrentUserId = async (preferredUserId?: string | null) => {
  if (preferredUserId) return preferredUserId;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return data.user.id;
    await wait(150);
  }

  return null;
};

const fetchDirectoryViaRpc = async () => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await (supabase as any).rpc('get_employee_directory');
    if (!error) return (data as any[]) || [];

    lastError = error;
    await wait(200);
  }

  throw lastError;
};

const fetchDirectoryViaEmployeesTable = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, auth_user_id, name, email, department, position, avatar_url, disabled, status')
    .eq('status', 'Active')
    .not('auth_user_id', 'is', null)
    .or('disabled.is.null,disabled.eq.false')
    .order('name');

  if (error) throw error;
  return (data as any[]) || [];
};

export const loadEmployeeDirectory = async ({
  currentUserId,
  excludeUserIds = [],
}: {
  currentUserId?: string | null;
  excludeUserIds?: Array<string | null | undefined>;
} = {}): Promise<DirectoryUser[]> => {
  const resolvedUserId = await resolveCurrentUserId(currentUserId);
  const filteredExcludeIds = excludeUserIds.filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const loader of [fetchDirectoryViaRpc, fetchDirectoryViaEmployeesTable]) {
    try {
      const rows = await loader();
      return mapDirectoryRows(rows, resolvedUserId, filteredExcludeIds);
    } catch (error) {
      lastError = error;
      console.warn('Employee directory lookup failed, trying next source:', error);
    }
  }

  throw lastError;
};