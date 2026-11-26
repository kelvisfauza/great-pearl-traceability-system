import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {z} from 'npm:zod@3.24.1';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
 const auth=req.headers.get('Authorization');if(!auth)return json({ok:false,error:'Sign in required'},401);
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!key)return json({ok:false,error:'Service unavailable'});
 const db=createClient(url,key,{global:{headers:{Authorization:auth}}});
 const user=await db.auth.getUser();if(user.error)return json({ok:false,error:'Sign in required'},401);
 const parsed=z.object({runId:z.string().uuid()}).passthrough().safeParse(await req.json().catch(()=>({})));
 if(!parsed.success)return json({ok:false,error:'Select a saved payroll run'},400);
 const result=await db.rpc('approve_salary_run_to_finance',{p_run_id:parsed.data.runId});
 return result.error?json({ok:false,error:result.error.message}):json(result.data);
});
