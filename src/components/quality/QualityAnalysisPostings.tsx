import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Mail, Eye, Loader2, Download, Save } from 'lucide-react';

const labels: Record<string,string> = {pending:'Awaiting review',reviewed:'Reviewed',needs_correction:'Needs correction'};
export default function QualityAnalysisPostings() {
  const { isAdmin } = useAuth();
  const [filter,setFilter] = useState('all');
  const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);
  const [selected,setSelected] = useState<any>(null);
  const [notes,setNotes] = useState('');
  const [review,setReview] = useState('reviewed');
  const [fileUrl,setFileUrl] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [orderId,setOrderId] = useState('none');
  const [deliveryId,setDeliveryId] = useState('none');
  const candidates=useQuery({queryKey:['quality-posting-candidates',selected?.id],enabled:!!selected,queryFn:async()=>{
    const res=await (supabase as any).rpc('quality_posting_candidates',{p_id:selected.id});if(res.error)throw res.error;return res.data;
  }});
  const link=async()=>{
    if(!selected)return;setBusy(true);setError('');
    try{const res=await (supabase as any).rpc('link_quality_posting',{p_id:selected.id,p_order_id:orderId==='none'?null:orderId,p_delivery_id:deliveryId==='none'?null:deliveryId});if(res.error)throw res.error;setSelected(null);await refresh();}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const rows = useQuery({queryKey:['quality-outlook-postings',filter,page],refetchInterval:60_000,queryFn:async()=>{
    let q=(supabase as any).from('quality_analysis_postings').select('*',{count:'exact'}).order('received_at',{ascending:false}).range(page*25,page*25+24);
    if(filter!=='all') q=q.eq('status',filter);
    const res=await q; if(res.error) throw res.error; return {items:res.data as any[],count:res.count as number};
  }});
  const status=useQuery({queryKey:['quality-outlook-status'],refetchInterval:60_000,queryFn:async()=>{
    const res=await (supabase as any).rpc('quality_outlook_status'); if(res.error) throw res.error; return res.data;
  }});
  const refresh=async()=>{await Promise.all([rows.refetch(),status.refetch()]);};
  const sync=async(action='sync')=>{
    setBusy(true);setError('');
    try {const res=await supabase.functions.invoke('quality-outlook-sync',{body:{action}});
      if(res.error) throw new Error(res.error instanceof FunctionsHttpError ? await res.error.context.text() : res.error.message);
      if(!res.data?.ok) throw new Error(res.data?.error ?? 'Outlook collection failed');
      await refresh();
    } catch(e:any){setError(e.message);} finally{setBusy(false);}
  };
  const open=async(item:any)=>{
    setOrderId(item.linked_sampling_order_id || 'none');setDeliveryId(item.linked_delivery_id || 'none');
    setSelected(item);setNotes(item.review_notes ?? '');setReview(item.status==='pending'?'reviewed':item.status);setFileUrl('');setError('');
    const result=await supabase.storage.from('quality-outlook-postings').createSignedUrl(item.storage_path,600);
    if(result.error)setError(result.error.message);else setFileUrl(result.data.signedUrl);
  };
  const save=async()=>{
    if(!selected)return;setBusy(true);setError('');
    try{const res=await (supabase as any).rpc('review_quality_posting',{p_id:selected.id,p_status:review,p_notes:notes});if(res.error)throw res.error;setSelected(null);await refresh();}
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const visible=rows.data?.items.filter(item=>[item.subject,item.sender_name,item.sender_email,item.form_number,item.supplier_name,item.batch_number,item.filename].join(' ').toLowerCase().includes(search.toLowerCase())) ?? [];
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5"/>Quality Analysis Postings</h2>
      <p className="text-sm text-muted-foreground">Outlook · {status.data?.last_success_at ? `Last checked ${new Date(status.data.last_success_at).toLocaleString()}`:'Not checked yet'}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button>
      <Button disabled={busy || status.data?.paused} onClick={()=>sync()}>{busy?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Mail className="mr-2 h-4 w-4"/>}Check Outlook</Button>
      {status.data?.paused && isAdmin() && <Button variant="outline" disabled={busy} onClick={()=>sync('resume')}>Resume collection</Button>}</div>
    </div>
    {(error || rows.error || status.error || status.data?.last_error) && <Alert variant="destructive"><AlertDescription className="break-words">{error || (rows.error as Error)?.message || (status.error as Error)?.message || status.data?.last_error}</AlertDescription></Alert>}
    <div className="flex flex-wrap gap-3"><Input className="max-w-sm" placeholder="Search this page" aria-label="Search postings" value={search} onChange={e=>setSearch(e.target.value)}/>
    <Select value={filter} onValueChange={v=>{setFilter(v);setPage(0);}}><SelectTrigger className="w-52"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All postings</SelectItem>{Object.entries(labels).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
    <div className="overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Received / Posted by</TableHead><TableHead>Analysis form</TableHead><TableHead>Supplier / Batch</TableHead><TableHead>Status</TableHead><TableHead>Attachment</TableHead></TableRow></TableHeader>
    <TableBody>{rows.isLoading?<TableRow><TableCell colSpan={5}>Loading postings…</TableCell></TableRow>:visible.length===0?<TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No quality analysis postings found.</TableCell></TableRow>:visible.map(item=><TableRow key={item.id}>
      <TableCell><div>{new Date(item.received_at).toLocaleDateString()}</div><div className="text-sm text-muted-foreground">{item.sender_name || item.sender_email}</div></TableCell>
      <TableCell><div>{item.form_number || 'Number not recorded'}</div><div className="text-sm text-muted-foreground max-w-64 break-words">{item.subject}</div></TableCell>
      <TableCell>{item.supplier_name || 'Not recorded'}<div className="text-sm text-muted-foreground">{item.batch_number || 'Batch not recorded'}</div><Badge variant="outline">{item.link_method ? (item.link_method==='admin_confirmed'?'Links confirmed':'Exact reference linked') : 'Unlinked'}</Badge></TableCell>
      <TableCell><Badge variant={item.status==='needs_correction'?'destructive':'secondary'}>{labels[item.status] ?? item.status}</Badge></TableCell>
      <TableCell><Button size="sm" variant="outline" onClick={()=>open(item)}><Eye className="mr-2 h-4 w-4"/>Review</Button></TableCell>
    </TableRow>)}</TableBody></Table></div>
    <div className="flex justify-between items-center gap-3"><span className="text-sm text-muted-foreground">{rows.data?.count ?? 0} postings · Page {page+1}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button size="sm" variant="outline" disabled={(page+1)*25 >= (rows.data?.count ?? 0)} onClick={()=>setPage(p=>p+1)}>Next</Button></div></div>
    <Dialog open={!!selected} onOpenChange={v=>{if(!v)setSelected(null);}}><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Quality Analysis Posting</DialogTitle></DialogHeader>
      {selected && <><div className="space-y-1 break-words"><p className="font-medium">{selected.subject}</p><p className="text-sm text-muted-foreground">{selected.sender_name} · {selected.sender_email}</p><p className="text-sm">Form: {selected.form_number || 'Not recorded'} · Analysis date: {selected.analysis_date || 'Not recorded'}</p></div>
      <div className="space-y-3 border-t pt-3"><h3 className="font-semibold">Sampling order & delivery</h3>
      {candidates.error && <Alert variant="destructive"><AlertDescription>{(candidates.error as Error).message}</AlertDescription></Alert>}
      <p className="text-sm">Sampling reference: {selected.sampling_order_number || 'Not recorded'} · {selected.link_method || 'Not linked'}</p>
      {isAdmin() ? <><Select value={orderId} onValueChange={v=>{setOrderId(v);const order=candidates.data?.orders?.find((o:any)=>o.id===v);setDeliveryId(order?.linked_store_record_id || 'none');}}><SelectTrigger aria-label="Linked sampling order"><SelectValue placeholder="Sampling order"/></SelectTrigger><SelectContent><SelectItem value="none">No sampling order</SelectItem>{selected.linked_sampling_order_id && !candidates.data?.orders?.some((o:any)=>o.id===selected.linked_sampling_order_id) && <SelectItem value={selected.linked_sampling_order_id}>Current order · {selected.linked_sampling_order_id}</SelectItem>}{candidates.data?.orders?.map((o:any)=><SelectItem key={o.id} value={o.id}>{o.order_number} · {o.supplier_name} · {new Date(o.delivery_time).toLocaleDateString()} · {o.reason}</SelectItem>)}</SelectContent></Select>
      <Select value={deliveryId} onValueChange={setDeliveryId}><SelectTrigger aria-label="Linked delivery"><SelectValue placeholder="Delivery"/></SelectTrigger><SelectContent><SelectItem value="none">No delivery</SelectItem>{deliveryId!=='none' && !candidates.data?.deliveries?.some((d:any)=>d.id===deliveryId) && <SelectItem value={deliveryId}>Linked delivery · {deliveryId}</SelectItem>}{candidates.data?.deliveries?.map((d:any)=><SelectItem key={d.id} value={d.id}>{d.batch_number} · {d.supplier_name} · {d.date} · {d.kilograms} kg · {d.reason}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={busy || candidates.isLoading} onClick={link}><Save className="mr-2 h-4 w-4"/>Confirm links</Button></> : <p className="text-sm break-words">Order: {selected.linked_sampling_order_id || 'Not linked'} · Delivery: {selected.linked_delivery_id || 'Not linked'}</p>}
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {fileUrl && <><Button asChild variant="outline"><a href={fileUrl} target="_blank" rel="noopener noreferrer"><Download className="mr-2 h-4 w-4"/>{selected.filename}</a></Button>{selected.mime_type.startsWith('image/')?<img src={fileUrl} alt="Quality analysis form" className="max-h-[50vh] w-full object-contain"/>:<iframe src={fileUrl} title="Quality analysis attachment" className="w-full h-[50vh] border rounded-md"/>}</>}
      {isAdmin()?<><Select value={review} onValueChange={setReview}><SelectTrigger aria-label="Review status"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labels).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Textarea aria-label="Administrator review notes" placeholder="Review notes" maxLength={4000} value={notes} onChange={e=>setNotes(e.target.value)}/><Button disabled={busy} onClick={save}><Save className="mr-2 h-4 w-4"/>Save review</Button></>:<p className="text-sm">{selected.review_notes || 'No administrator notes yet.'}</p>}</>}
    </DialogContent></Dialog>
  </section>;
}