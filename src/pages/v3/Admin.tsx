import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import V3Layout from '@/components/v3/V3Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useV3Roles, V3Role, V3_ROLE_LABELS } from '@/hooks/useV3Roles';
import { Trash2, Plus } from 'lucide-react';

export default function V3Admin() {
  const { isV3Admin } = useV3Roles();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [branch, setBranch] = useState<Record<string, string>>({});
  const [assign, setAssign] = useState<Record<string, string>>({});

  const { data: branches = [] } = useQuery({
    queryKey: ['v3-admin-branches'],
    queryFn: async () => (await supabase.from('v3_branches').select('*').order('name')).data as any[] || [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['v3-admin-employees'],
    queryFn: async () => (await supabase.from('employees').select('id, name, email, auth_user_id, department').eq('status', 'Active').order('name')).data as any[] || [],
  });

  const { data: roleRows = [] } = useQuery({
    queryKey: ['v3-admin-roles'],
    queryFn: async () => (await supabase.from('v3_user_roles').select('*')).data as any[] || [],
  });

  const addBranch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('v3_branches').insert({
        code: branch.code, name: branch.name, location: branch.location || null,
        is_head_office: branch.is_head_office === 'yes',
        approval_limit: Number(branch.approval_limit || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => { setBranch({}); qc.invalidateQueries({ queryKey: ['v3-admin-branches'] }); toast({ title: 'Branch added' }); },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const addRole = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('v3_user_roles').insert({
        user_id: assign.user_id,
        role: assign.role as V3Role,
        branch_id: assign.branch_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setAssign({}); qc.invalidateQueries({ queryKey: ['v3-admin-roles'] }); toast({ title: 'Role assigned' }); },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('v3_user_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v3-admin-roles'] }),
  });

  const nameFor = (uid: string) => employees.find((e: any) => e.auth_user_id === uid)?.name || uid.slice(0, 8);

  if (!isV3Admin) {
    return (
      <V3Layout title="Administration">
        <Card><CardContent className="p-6 text-sm text-muted-foreground">You do not have access to V3 administration.</CardContent></Card>
      </V3Layout>
    );
  }

  return (
    <V3Layout title="V3 Administration" description="Branches, user roles and access control">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Branches</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <div><Label className="text-xs">Code</Label><Input value={branch.code || ''} onChange={(e) => setBranch({ ...branch, code: e.target.value })} /></div>
            <div><Label className="text-xs">Name</Label><Input value={branch.name || ''} onChange={(e) => setBranch({ ...branch, name: e.target.value })} /></div>
            <div><Label className="text-xs">Location</Label><Input value={branch.location || ''} onChange={(e) => setBranch({ ...branch, location: e.target.value })} /></div>
            <div><Label className="text-xs">Approval limit</Label><Input type="number" value={branch.approval_limit || ''} onChange={(e) => setBranch({ ...branch, approval_limit: e.target.value })} /></div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => addBranch.mutate()} disabled={!branch.code || !branch.name}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Float</TableHead><TableHead>Limit</TableHead></TableRow></TableHeader>
            <TableBody>
              {branches.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.code}</TableCell>
                  <TableCell>{b.name} {b.is_head_office && <Badge variant="secondary" className="ml-1">HO</Badge>}</TableCell>
                  <TableCell>{b.location || '—'}</TableCell>
                  <TableCell className="tabular-nums">{Number(b.float_balance).toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{Number(b.approval_limit).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">User roles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={assign.user_id} onValueChange={(v) => setAssign({ ...assign, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e: any) => e.auth_user_id).map((e: any) => (
                    <SelectItem key={e.id} value={e.auth_user_id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={assign.role} onValueChange={(v) => setAssign({ ...assign, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(V3_ROLE_LABELS) as V3Role[]).map((r) => (
                    <SelectItem key={r} value={r}>{V3_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Branch (optional)</Label>
              <Select value={assign.branch_id} onValueChange={(v) => setAssign({ ...assign, branch_id: v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>{branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={() => addRole.mutate()} disabled={!assign.user_id || !assign.role}>Assign role</Button>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {roleRows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No V3 roles assigned yet.</TableCell></TableRow>}
              {roleRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{nameFor(r.user_id)}</TableCell>
                  <TableCell><Badge variant="secondary">{V3_ROLE_LABELS[r.role as V3Role]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => removeRole.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </V3Layout>
  );
}