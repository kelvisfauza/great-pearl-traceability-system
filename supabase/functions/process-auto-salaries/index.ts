import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {requireInternalOrAdmin} from '../_shared/internal-auth.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 const denied=await requireInternalOrAdmin(req,corsHeaders);if(denied)return denied;
 return new Response(JSON.stringify({ok:false,error:'Bulk salary disbursement is disabled. HR must approve payroll and Finance must release each salary into its wallet.',status:'finance_required'}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
});
