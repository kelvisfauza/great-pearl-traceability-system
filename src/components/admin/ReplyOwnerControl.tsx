import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function ReplyOwnerControl({ kind, recordId }: { kind: 'quotation' | 'support'; recordId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { data: isAdmin } = useQuery({ queryKey: ['reply-assign-admin', user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user?.id || '').in('role', ['Administrator','Super Admin']);
    if (error) throw error;
    return !!data?.length;
  } });
  const { data: choices = [] } = useQuery({ queryKey: ['reply-owner-staff'], enabled: !!isAdmin, queryFn: async () => {
    const { data, error } = await supabase.from('employees').select('id,name').ilike('status','active').or('disabled.is.null,disabled.eq.false').order('name');
    if (error) throw error;
    return data || [];
  } });
  const { data: selected, refetch } = useQuery({ queryKey: ['reply-owner',kind,recordId], enabled: !!isAdmin, queryFn: async () => {
    const { data, error } = await supabase.from(kind === 'quotation' ? 'quotations' : 'support_tickets').select('assigned_to').eq('id',recordId).single();
    if (error) throw error;
    return data.assigned_to;
  } });
  if (!isAdmin) return null;
  return <div className="space-y-1"><Label>Staff responsible for replies</Label><Select value={selected || ''} disabled={busy} onValueChange={async employeeId => {
    setBusy(true);
    try { const { error } = await supabase.rpc('assign_reply_owner', { p_kind: kind, p_record_id: recordId, p_employee_id: employeeId }); if (error) throw error; await refetch(); toast({ title: 'Reply responsibility saved' }); }
    catch (error) { toast({ title: 'Assignment not saved', description: error instanceof Error ? error.message : 'Please try again', variant: 'destructive' }); }
    finally { setBusy(false); }
  }}><SelectTrigger><SelectValue placeholder="Choose an employee" /></SelectTrigger><SelectContent>{choices.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>;
}