import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERMISSIONS } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FileSignature, Check, X, Loader2 } from 'lucide-react';
import { generateApprovedContractBlob } from '@/utils/contractRenewalApprovedPdf';

const ROLE_OPTIONS = ['User', 'Supervisor', 'Manager', 'Admin'];
const PERMISSION_LIST = Object.values(PERMISSIONS).filter((p) => p !== '*');

const ContractRenewalApprovals = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<Record<string, {
    position: string; department: string; salary: string; role: string; permissions: string[];
  }>>({});
  const [employees, setEmployees] = useState<Record<string, any>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('contract_renewal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    const rows = data || [];
    setItems(rows);

    // Hydrate per-request overrides from existing employee profile
    if (rows.length) {
      const emails = Array.from(new Set(rows.map((r: any) => r.employee_email)));
      const { data: emps } = await supabase
        .from('employees')
        .select('email, position, department, salary, role, permissions')
        .in('email', emails as string[]);
      const map: Record<string, any> = {};
      (emps || []).forEach((e: any) => { map[e.email?.toLowerCase()] = e; });
      setEmployees(map);
      const ov: any = {};
      rows.forEach((r: any) => {
        const e = map[r.employee_email?.toLowerCase()] || {};
        ov[r.id] = {
          position: e.position || '',
          department: e.department || '',
          salary: e.salary ? String(e.salary) : '',
          role: e.role || 'User',
          permissions: Array.isArray(e.permissions) ? e.permissions : ['General Access'],
        };
      });
      setOverrides(ov);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateOverride = (id: string, patch: Partial<{ position: string; department: string; salary: string; role: string; permissions: string[] }>) => {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));
  };

  const togglePerm = (id: string, perm: string) => {
    const cur = overrides[id]?.permissions || [];
    const next = cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm];
    updateOverride(id, { permissions: next });
  };

  const act = async (id: string, decision: 'approve' | 'reject') => {
    if (!employee) return;
    if (decision === 'approve') {
      const ov = overrides[id];
      if (!ov?.position?.trim() || !ov?.department?.trim()) {
        toast({ title: 'Missing details', description: 'Position and Department are required to approve.', variant: 'destructive' });
        return;
      }
    }
    setActing(id);
    const { data, error } = await supabase.functions.invoke('approve-contract-renewal', {
      body: {
        requestId: id,
        decision,
        adminEmail: employee.email,
        adminNotes: notes[id] || '',
        overrides: decision === 'approve' ? {
          position: overrides[id]?.position?.trim() || null,
          department: overrides[id]?.department?.trim() || null,
          salary: overrides[id]?.salary ? Number(overrides[id].salary) : null,
          role: overrides[id]?.role || null,
          permissions: overrides[id]?.permissions || null,
        } : undefined,
      },
    });
    if (error || (data && data.ok === false)) {
      setActing(null);
      toast({ title: `Failed to ${decision}`, description: error?.message || data?.error || 'Unknown error', variant: 'destructive' });
      return;
    }

    // On approval: generate PDF contract, upload, then email the employee with the link
    if (decision === 'approve' && data?.contract) {
      try {
        const c = data.contract;
        const fmt = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const blob = generateApprovedContractBlob({
          employeeName: c.employee_name,
          employeeEmail: c.employee_email,
          employeeId: c.employee_id || undefined,
          position: c.position,
          department: c.department,
          salary: Number(c.salary || 0),
          durationMonths: Number(c.duration_months),
          startDate: fmt(c.start_date),
          endDate: fmt(c.end_date),
          role: c.role || undefined,
          approvedBy: employee.name || employee.email,
          approvalDate: fmt(new Date().toISOString()),
          renewalCount: Number(c.renewal_count || 1),
          adminNotes: notes[id] || undefined,
        });
        const safeName = String(c.employee_name || 'employee').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
        const path = `renewals/${safeName}-${id.substring(0, 8)}-${Date.now()}.pdf`;
        const file = new File([blob], path.split('/').pop()!, { type: 'application/pdf' });
        const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { upsert: true, contentType: 'application/pdf' });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24 * 90);
        const pdfUrl = signed?.signedUrl || '';

        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: c.employee_email,
            idempotencyKey: `contract-renewal-approved-${id}`,
            templateData: {
              subject: 'Contract Renewal Approved — Great Agro Coffee',
              title: 'Your Contract Has Been Renewed',
              recipientName: c.employee_name,
              message:
`We are pleased to confirm that your contract has been renewed.

• Position: ${c.position}
• Department: ${c.department}
• Duration: ${c.duration_months} months
• Start date: ${fmt(c.start_date)}
• End date: ${fmt(c.end_date)}
• Gross salary (UGX): ${Number(c.salary || 0).toLocaleString()}

Your signed contract PDF is attached as a secure download link below (valid for 90 days):
${pdfUrl}

${notes[id] ? 'Note from administration: ' + notes[id] + '\n\n' : ''}You now have full access to the system. Welcome back!

Great Agro Coffee — Human Resources`,
            },
          },
        });
      } catch (e: any) {
        console.error('Contract PDF/email failed', e);
        toast({ title: 'Approved, but email failed', description: e?.message || 'Could not send contract PDF email.', variant: 'destructive' });
        setActing(null);
        load();
        return;
      }
    }

    setActing(null);
    toast({ title: decision === 'approve' ? 'Renewal approved' : 'Renewal rejected', description: 'Employee has been notified by email.' });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Contract Renewal Requests
          {items.length > 0 && <Badge variant="destructive">{items.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">No pending renewal requests</div>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-3 bg-card">
                <div className="flex justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee_email}</p>
                  </div>
                  <Badge className="bg-amber-500">{r.requested_months} month renewal</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Phone:</span> {r.updated_phone || '—'}</div>
                  <div><span className="text-muted-foreground">Emergency:</span> {r.emergency_contact || '—'}</div>
                  <div><span className="text-muted-foreground">NSSF:</span> {r.nssf_number || '—'}</div>
                  <div><span className="text-muted-foreground">TIN:</span> {r.tin_number || '—'}</div>
                  <div><span className="text-muted-foreground">Bank:</span> {r.bank_name || '—'}</div>
                  <div><span className="text-muted-foreground">Acct:</span> {r.bank_account || '—'}</div>
                </div>
                <div className="text-sm bg-muted/50 rounded p-2">
                  <span className="text-xs text-muted-foreground">Reason: </span>{r.reason}
                </div>
                <div className="text-xs text-muted-foreground">Signed: <span className="font-serif italic">{r.signature}</span></div>

                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-semibold">Set role & contract details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Position *</Label>
                      <Input value={overrides[r.id]?.position || ''} onChange={(e) => updateOverride(r.id, { position: e.target.value })} placeholder="e.g. IT Officer" />
                    </div>
                    <div>
                      <Label className="text-xs">Department *</Label>
                      <Input value={overrides[r.id]?.department || ''} onChange={(e) => updateOverride(r.id, { department: e.target.value })} placeholder="e.g. IT" />
                    </div>
                    <div>
                      <Label className="text-xs">Salary (UGX)</Label>
                      <Input type="number" value={overrides[r.id]?.salary || ''} onChange={(e) => updateOverride(r.id, { salary: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Select value={overrides[r.id]?.role || 'User'} onValueChange={(v) => updateOverride(r.id, { role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((ro) => <SelectItem key={ro} value={ro}>{ro}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Permissions</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-auto p-2 border rounded">
                      {PERMISSION_LIST.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={(overrides[r.id]?.permissions || []).includes(perm)}
                            onCheckedChange={() => togglePerm(r.id, perm)}
                          />
                          <span>{perm}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[r.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => act(r.id, 'approve')} disabled={acting === r.id} className="flex-1 bg-green-600 hover:bg-green-700">
                    {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Approve</>}
                  </Button>
                  <Button onClick={() => act(r.id, 'reject')} disabled={acting === r.id} variant="destructive" className="flex-1">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractRenewalApprovals;