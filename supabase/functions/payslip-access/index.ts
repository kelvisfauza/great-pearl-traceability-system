import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireStaff } from '../_shared/internal-auth.ts';
const cors = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown) => new Response(JSON.stringify(body), { status:200,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'} });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null,{headers:cors});
  const caller = await requireStaff(req,cors);
  if (caller instanceof Response) return caller;
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL') || '',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const body = await req.json();
    let isAdministrator = false;
    if (caller.internal) {
      // Trusted maintenance can revoke old bearer links, never download salaries.
      if (body.action !== 'rotate_legacy') return json({ok:false,error:'Staff sign-in required'});
      isAdministrator = true;
    } else {
      if (!caller.email || !caller.userId) return json({ok:false,error:'Staff sign-in required'});
      const { data: actor } = await db.from('employees').select('status,disabled').ilike('email',caller.email).maybeSingle();
      if (!actor || actor.disabled || String(actor.status).toLowerCase() !== 'active') return json({ok:false,error:'Account unavailable'});
      const { data: roles, error: roleError } = await db.from('user_roles').select('role').eq('user_id',caller.userId).in('role',['Administrator','Super Admin']);
      if (roleError) throw roleError;
      isAdministrator = !!roles?.length;
    }
    if (body.action === 'rotate_legacy') {
      if (!isAdministrator || body.confirmation !== 'REVOKE LEGACY PAYSLIP LINKS') return json({ok:false,error:'Administrator confirmation required'});
      const { data: employees, error: staffError } = await db.from('employees').select('name,email');
      if (staffError) throw staffError;
      const storage = db.storage.from('statements');
      const readFolder = async (folder: string) => {
        const items: any[] = [];
        for (let offset=0;;offset+=100) {
          const {data,error} = await storage.list(folder,{limit:100,offset});
          if(error) throw error;
          items.push(...(data || [])); if((data || []).length<100) return items;
        }
      };
      let rotated=0, skipped=0;
      for (const month of await readFolder('payslips')) {
        if (month.id) { skipped++; continue; }
        for (const file of await readFolder(`payslips/${month.name}`)) {
          if (!file.id || !file.name.endsWith('.pdf')) continue;
          const matches=(employees || []).filter(e=>file.name===`payslip_${String(e.name).replace(/[^a-zA-Z0-9]/g,'_')}_${month.name}.pdf`);
          // Preserve unmatched historical PDFs for administrator-only recovery;
          // never guess an employee identity from an ambiguous old filename.
          const owner=matches.length===1 ? matches[0] : { email:'unassigned-payslip@example.invalid' };
          const oldPath=`payslips/${month.name}/${file.name}`;
          const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(oldPath));
          const safePath=`secured-payslips/${Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')}.pdf`;
          const {error:copyError}=await storage.copy(oldPath,safePath);
          if(copyError && !/already exists|duplicate/i.test(copyError.message)) throw copyError;
          const {error:registryError}=await db.from('payslip_access_records').upsert({employee_email:owner.email,storage_path:safePath,label:file.name},{onConflict:'storage_path'});
          if(registryError) throw registryError;
          const {error:removeError}=await storage.remove([oldPath]);
          if(removeError) throw removeError;
          if(matches.length!==1) skipped++;
          rotated++;
        }
      }
      return json({ok:true,rotated,skipped});
    }
    const {data:record,error}=await db.from('payslip_access_records').select('*').eq('id',body.id).maybeSingle();
    if(error || !record || (!isAdministrator && record.employee_email.toLowerCase()!==caller.email?.toLowerCase())) return json({ok:false,error:'Payslip unavailable'});
    const {data:owner}=await db.from('employees').select('disabled,status').ilike('email',record.employee_email).maybeSingle();
    if(!isAdministrator && (!owner || owner.disabled || String(owner.status).toLowerCase()!=='active')) return json({ok:false,error:'Payslip unavailable'});
    const {data:file,error:downloadError}=await db.storage.from('statements').download(record.storage_path);
    if(downloadError || !file) throw new Error('Payslip unavailable');
    const bytes=new Uint8Array(await file.arrayBuffer());
    let raw=''; for(let offset=0;offset<bytes.length;offset+=8192) raw+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
    return json({ok:true,base64:btoa(raw),label:record.label});
  } catch { return json({ok:false,error:'Payslip access could not be verified'}); }
});