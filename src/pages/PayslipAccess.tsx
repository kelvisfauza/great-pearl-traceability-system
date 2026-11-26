import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

export default function PayslipAccess() {
  const { id } = useParams();
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [label,setLabel]=useState('Payslip.pdf');
  useEffect(()=>{
    let cancelled=false, objectUrl='';
    (async()=>{
      const {data,error:failure}=await supabase.functions.invoke('payslip-access',{body:{id}});
      if(cancelled) return;
      if(failure || !data?.ok) { setError('This payslip is unavailable for your signed-in account.'); return; }
      const bytes=Uint8Array.from(atob(data.base64),(c)=>c.charCodeAt(0));
      objectUrl=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})); setUrl(objectUrl);setLabel(data.label || 'Payslip.pdf');
    })().catch(()=>{if(!cancelled)setError('Payslip could not be loaded.');});
    return()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[id]);
  return <main className="p-4 space-y-4"><Helmet><title>Payslip · Great Agro Coffee</title><meta name="robots" content="noindex,nofollow" /></Helmet><div className="flex items-center justify-between gap-3"><h1 className="text-xl font-semibold">Payslip</h1>{url && <Button variant="outline" onClick={()=>{const a=document.createElement('a');a.href=url;a.download=label;a.click();}}><Download className="h-4 w-4 mr-2" />Download</Button>}</div>{error ? <p className="text-destructive">{error}</p> : url ? <iframe title="Payslip document" src={url} className="w-full h-[80vh] border border-border" /> : <Loader2 className="h-6 w-6 animate-spin text-primary" />}</main>;
}