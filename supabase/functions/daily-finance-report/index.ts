import {createClient} from 'npm:@supabase/supabase-js@2';
import {corsHeaders} from 'npm:@supabase/supabase-js@2/cors';
import {sendLovableEmail} from 'npm:@lovable.dev/email-js@0.0.4';
import {z} from 'npm:zod@3.24.1';
import {encodeBase64} from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import {requireInternalOrAdmin} from '../_shared/internal-auth.ts';
import {reportWindow} from './rules.ts';
const RECIPIENT='Fauzakusa@greatpearlcoffee.com';
const bodySchema=z.object({date:z.string().optional(),test:z.boolean().default(false),dryRun:z.boolean().default(false)}).strict();
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json'}});
  const denied=await requireInternalOrAdmin(req,corsHeaders);if(denied)return denied;
  try{
    const parsed=bodySchema.safeParse(await req.json().catch(()=>({})));
    if(!parsed.success)return json({ok:false,error:'Invalid report options'},400);
    const {test,dryRun}=parsed.data;
    const date=parsed.data.date??new Date(Date.now()+10800000).toISOString().slice(0,10);
    const window=reportWindow(date,test);
    if(new Date(window.end).getTime()>Date.now())return json({ok:false,error:'The report period has not ended yet.'});
    const url=Deno.env.get('SUPABASE_URL');const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const emailKey=Deno.env.get('LOVABLE_API_KEY');
    if(!url||!service||!emailKey)throw new Error('Reporting credentials unavailable');
    const db=createClient(url,service,{auth:{persistSession:false}});
    // No caller-selected recipients and no colleague/private mailbox fallback.
    const recipient=await db.from('employees').select('name,email,disabled').ilike('email',RECIPIENT).maybeSingle();
    if(recipient.error||!recipient.data||recipient.data.disabled===true)throw new Error('The report administrator is unavailable');
    const existing=await db.from('daily_finance_report_runs').select('*').eq('report_date',date).eq('cutoff_at',window.end).eq('is_test',test).maybeSingle();
    if(existing.error)throw existing.error;
    let run=existing.data;
    if(!run){
      const result=await db.rpc('daily_finance_snapshot',{p_start:window.start,p_end:window.end});
      if(result.error||!result.data)throw new Error(result.error?.message||'Finance snapshot unavailable');
      const code=`DOC-FIN-${crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase()}`;
      const inserted=await db.from('daily_finance_report_runs').insert({report_date:date,cutoff_at:window.end,is_test:test,snapshot:result.data,verification_code:code}).select('*').single();
      if(inserted.error)throw new Error('Report already being prepared or could not be saved. Do not retry an uncertain email.');
      run=inserted.data;
    }
    if(!run)throw new Error('Report record unavailable');
    if(!run.storage_path){
      const {buildFinancePdf}=await import('./report.ts');
      const {default:QRCode}=await import('npm:qrcode@1.5.4');
      const verification=await db.from('verifications').upsert({code:run.verification_code,type:'document',subtype:'system_print',status:'verified',issued_to_name:'Automated Finance Reporting',issued_at:run.created_at,reference_no:`Daily Finance Report ${date}`,meta:{title:`Daily Finance Report ${date}`,format:'pdf',generated_by:'Automated Finance Reporting',report_run_id:run.id,report_date:date,cutoff_at:window.end,verification_scope:'Document issuance only; not payment or approval confirmation.'}},{onConflict:'code'});
      if(verification.error)throw new Error(`Report verification failed: ${verification.error.message}`);
      const qr=await QRCode.toDataURL(`https://greatpearlcoffeesystem.site/verify/${run.verification_code}`,{width:192,margin:2});
      const pdf=buildFinancePdf(run.snapshot,date,run.verification_code,qr,'Automated Finance Reporting');
      const path=`finance/${date}/${run.id}.pdf`;
      const upload=await db.storage.from('daily-reports').upload(path,pdf,{contentType:'application/pdf',upsert:true});
      if(upload.error)throw upload.error;
      const saved=await db.from('daily_finance_report_runs').update({storage_path:path,status:'prepared'}).eq('id',run.id).select('*').single();
      if(saved.error)throw saved.error;run=saved.data;
    }
    const signed=await db.storage.from('daily-reports').createSignedUrl(run.storage_path,604800);
    if(signed.error)throw signed.error;
    if(dryRun){
      const stored=await db.storage.from('daily-reports').download(run.storage_path);
      if(stored.error)throw stored.error;
      return json({ok:true,date,status:run.status,downloadUrl:signed.data.signedUrl,pdf_base64:encodeBase64(await stored.data.arrayBuffer())});
    }
    if(run.status==='email_accepted')return json({ok:true,date,status:run.status,email:run.email_result,alreadySent:true});
    // A concurrent run or uncertain send is never silently retried.
    const claim=await db.from('daily_finance_report_runs').update({status:'sending'}).eq('id',run.id).eq('status','prepared').select('id').maybeSingle();
    if(claim.error||!claim.data)return json({ok:false,error:'Report delivery is already in progress or needs review; no duplicate email sent.'});
    const subject=`${test?'TEST - ':''}Daily Finance & Treasury Report - ${date}`;
    const text=`Dear ${recipient.data.name},\n\nYour finance report for ${date} is ready. It includes treasury account balances and actions, payouts, charges, refunds, cash activity, expenses and unpaid balances.\n\nDownload the PDF (private link, expires in 7 days): ${signed.data.signedUrl}\n\n${test?'Test report for the full previous day.':'Daily report covers midnight to 8 PM Uganda time.'}\nGreat Agro Coffee`;
    try{
      const idem=`daily-finance-${run.id}`;
      const result=await sendLovableEmail({to:RECIPIENT,from:'Great Agro Coffee <noreply@notify.greatpearlcoffeesystem.site>',sender_domain:'notify.greatpearlcoffeesystem.site',subject,text,html:`<p>Dear ${recipient.data.name.replace(/[<>&"]/g,'')},</p><p>Your finance and treasury report for <strong>${date}</strong> is ready.</p><p><a href="${signed.data.signedUrl}">Download the finance PDF</a></p><p>Includes treasury balances and actions, payouts, charges, refunds and unpaid balances. The private link expires in 7 days.</p><p>Great Agro Coffee</p>`,purpose:'transactional',label:'daily-finance-report',idempotency_key:idem,unsubscribe_token:crypto.randomUUID()},{apiKey:emailKey,idempotencyKey:idem});
      if(result.success!==true)throw new Error('Email service did not confirm acceptance');
      const saved=await db.from('daily_finance_report_runs').update({status:'email_accepted',email_result:result}).eq('id',run.id);
      if(saved.error)throw new Error('Email accepted but delivery record could not be saved. Do not resend.');
      return json({ok:true,date,status:'email_accepted',recipient:RECIPIENT,email:result});
    }catch(e){
      await db.from('daily_finance_report_runs').update({status:'delivery_review',email_result:{error:e instanceof Error?e.message:'Email outcome uncertain'}}).eq('id',run.id);
      throw e;
    }
  }catch(e){return json({ok:false,error:e instanceof Error?e.message:'Report failed'});}
});
