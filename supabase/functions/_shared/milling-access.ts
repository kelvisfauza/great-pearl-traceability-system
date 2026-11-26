import { requireStaff } from './internal-auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export async function requireMilling(req: Request, cors: Record<string,string>) {
  const caller = await requireStaff(req,cors);
  if (caller instanceof Response || caller.internal) return caller;
  const db = createClient(Deno.env.get('SUPABASE_URL') || '',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
  const { data: employee, error } = await db.from('employees').select('permissions,status,disabled').ilike('email',caller.email || '').maybeSingle();
  if (!error && employee && !employee.disabled && String(employee.status).toLowerCase() === 'active' && (caller.isAdmin || employee.permissions?.some((p: string) => /^milling(?::|$)/i.test(p)))) return caller;
  return new Response(JSON.stringify({ ok:false,error:'Milling, Finance or administrator access required' }), { status:403,headers:{...cors,'Content-Type':'application/json'} });
}