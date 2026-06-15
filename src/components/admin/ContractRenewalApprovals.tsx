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
import { FileSignature, Check, X, Loader2, MessageSquare, ArrowDownToLine } from 'lucide-react';
import { generateApprovedContractBlob } from '@/utils/contractRenewalApprovedPdf';

const ROLE_OPTIONS = ['User', 'Supervisor', 'Manager', 'Admin'];
const PERMISSION_LIST = Object.values(PERMISSIONS).filter((p) => p !== '*');

const ContractRenewalApprovals = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [resending, setResending] = useState<string | null>(null);
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
      .in('status', ['pending', 'negotiating'])
      .order('created_at', { ascending: false });
    const rows = data || [];
    setItems(rows);

    // Recently approved renewals — for resending the contract email
    const { data: apr } = await (supabase as any)
      .from('contract_renewal_requests')
      .select('id, employee_name, employee_email, requested_months, approved_at, admin_notes, new_contract_id')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(20);
    const aprRows = apr || [];
    if (aprRows.length) {
      const contractIds = aprRows.map((r: any) => r.new_contract_id).filter(Boolean);
      const { data: contracts } = await supabase
        .from('employee_contracts')
        .select('id, position, department, salary, contract_start_date, contract_end_date, renewal_count, employee_gac_id')
        .in('id', contractIds);
      const cmap: Record<string, any> = {};
      (contracts || []).forEach((c: any) => { cmap[c.id] = c; });
      setApproved(aprRows.map((r: any) => ({ ...r, contract: cmap[r.new_contract_id] })));
    } else {
      setApproved([]);
    }

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

  const resendEmail = async (r: any) => {
    if (!r.contract) {
      toast({ title: 'Cannot resend', description: 'No linked contract record found.', variant: 'destructive' });
      return;
    }
    setResending(r.id);
    try {
      const c = r.contract;
      const fmt = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const blob = generateApprovedContractBlob({
        employeeName: r.employee_name,
        employeeEmail: r.employee_email,
        employeeId: c.employee_gac_id || undefined,
        position: c.position,
        department: c.department,
        salary: Number(c.salary || 0),
        durationMonths: Number(r.requested_months),
        startDate: fmt(c.contract_start_date),
        endDate: fmt(c.contract_end_date),
        approvedBy: employee?.name || employee?.email || 'Administrator',
        approvalDate: fmt(r.approved_at || new Date().toISOString()),
        renewalCount: Number(c.renewal_count || 1),
        adminNotes: r.admin_notes || undefined,
      });
      const safeName = String(r.employee_name || 'employee').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);
      const path = `renewals/${safeName}-${r.id.substring(0, 8)}-${Date.now()}.pdf`;
      const file = new File([blob], path.split('/').pop()!, { type: 'application/pdf' });
      const { error: upErr } = await supabase.storage.from('contracts').upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('contracts').createSignedUrl(path, 60 * 60 * 24 * 90);
      const pdfUrl = signed?.signedUrl || '';

      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'general-notification',
          recipientEmail: r.employee_email,
          idempotencyKey: `contract-renewal-approved-resend-${r.id}-${Date.now()}`,
          templateData: {
            subject: 'Contract Renewal Approved — Great Agro Coffee',
            title: 'Your Contract Has Been Renewed',
            recipientName: r.employee_name,
            ctaUrl: pdfUrl,
            ctaLabel: 'Download Contract PDF',
            message:
`We are pleased to confirm that your contract has been renewed.

• Position: ${c.position}
• Department: ${c.department}
• Duration: ${r.requested_months} months
• Start date: ${fmt(c.contract_start_date)}
• End date: ${fmt(c.contract_end_date)}
• Gross salary (UGX): ${Number(c.salary || 0).toLocaleString()}

Your signed contract PDF is ready. Click the button below to download it (link valid for 90 days).

${r.admin_notes ? 'Note from administration: ' + r.admin_notes + '\n\n' : ''}You now have full access to the system. Welcome back!

Great Agro Coffee — Human Resources`,
          },
        },
      });
      toast({ title: 'Email sent', description: `Contract PDF emailed to ${r.employee_email}` });
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e?.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setResending(null);
    }
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

  const applyRequested = (r: any) => {
    updateOverride(r.id, {
      position: r.requested_position?.trim() || overrides[r.id]?.position || '',
      salary: r.requested_salary != null ? String(r.requested_salary) : overrides[r.id]?.salary || '',
    });
    toast({ title: 'Requested values applied', description: 'Review then Approve to issue the revised contract.' });
  };

  const declineChanges = async (id: string) => {
    if (!employee) return;
    setActing(id);
    const r = items.find((x) => x.id === id);
    const { error } = await (supabase as any)
      .from('contract_renewal_requests')
      .update({
        status: 'changes_declined',
        hr_response: notes[id] || 'Requested changes not approved. Please sign the original renewal terms.',
        hr_responded_at: new Date().toISOString(),
        hr_responded_by: employee.email,
      })
      .eq('id', id);
    if (error) {
      setActing(null);
      toast({ title: 'Failed to decline', description: error.message, variant: 'destructive' });
      return;
    }
    try {
      if (r) {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'general-notification',
            recipientEmail: r.employee_email,
            idempotencyKey: `renewal-changes-declined-${id}`,
            templateData: {
              subject: 'Contract Change Request — HR Response',
              title: 'Your Requested Contract Changes',
              recipientName: r.employee_name,
              message:
`Dear ${r.employee_name},

After review, HR is unable to accommodate the contract changes you proposed.

HR response: ${notes[id] || 'Your proposed changes cannot be applied at this time.'}

To continue your employment, please log back into the system and accept the original renewal terms, or contact HR to schedule a meeting.

Great Agro Coffee — Human Resources`,
            },
          },
        });
      }
    } catch (e) { console.warn('Decline email failed', e); }
    setActing(null);
    toast({ title: 'Change request declined', description: 'Employee notified by email.' });
    load();
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
            ctaUrl: pdfUrl,
            ctaLabel: 'Download Contract PDF',
              message:
`We are pleased to confirm that your contract has been renewed.

• Position: ${c.position}
• Department: ${c.department}
• Duration: ${c.duration_months} months
• Start date: ${fmt(c.start_date)}
• End date: ${fmt(c.end_date)}
• Gross salary (UGX): ${Number(c.salary || 0).toLocaleString()}

Your signed contract PDF is ready. Click the button below to download it (link valid for 90 days).

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
                  <div className="flex gap-2">
                    {r.status === 'negotiating' && (
                      <Badge className="bg-blue-600 gap-1"><MessageSquare className="h-3 w-3" /> Change Request</Badge>
                    )}
                    <Badge className="bg-amber-500">{r.requested_months} month renewal</Badge>
                  </div>
                </div>
                {r.status === 'negotiating' && (
                  <div className="border border-blue-300 bg-blue-50 dark:bg-blue-950/20 rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Employee's proposed changes</p>
                      <Button size="sm" variant="outline" onClick={() => applyRequested(r)} className="h-7 text-xs gap-1">
                        <ArrowDownToLine className="h-3 w-3" /> Apply requested
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Requested salary:</span> {r.requested_salary != null ? `UGX ${Number(r.requested_salary).toLocaleString()}` : '—'}</div>
                      <div><span className="text-muted-foreground">Requested position:</span> {r.requested_position || '—'}</div>
                    </div>
                    {r.requested_role_changes && (
                      <div className="text-xs"><span className="text-muted-foreground">Role changes:</span> {r.requested_role_changes}</div>
                    )}
                    {r.requested_other_terms && (
                      <div className="text-xs"><span className="text-muted-foreground">Other terms:</span> {r.requested_other_terms}</div>
                    )}
                    {r.negotiation_notes && (
                      <div className="text-xs"><span className="text-muted-foreground">Justification:</span> {r.negotiation_notes}</div>
                    )}
                    {r.grace_period_until && (
                      <p className="text-[10px] text-muted-foreground">Grace period until {new Date(r.grace_period_until).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
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
                  placeholder={r.status === 'negotiating' ? 'HR response to employee (required when declining)' : 'Admin notes (optional)'}
                  value={notes[r.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={() => act(r.id, 'approve')} disabled={acting === r.id} className="flex-1 bg-green-600 hover:bg-green-700">
                    {acting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {r.status === 'negotiating' ? 'Issue Revised Contract' : 'Approve'}</>}
                  </Button>
                  {r.status === 'negotiating' && (
                    <Button onClick={() => declineChanges(r.id)} disabled={acting === r.id} variant="outline" className="flex-1">
                      Decline Changes
                    </Button>
                  )}
                  <Button onClick={() => act(r.id, 'reject')} disabled={acting === r.id} variant="destructive" className="flex-1">
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approved.length > 0 && (
          <div className="mt-8 border-t pt-4">
            <p className="text-sm font-semibold mb-3">Recently Approved — Resend Contract Email</p>
            <div className="space-y-2">
              {approved.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-3 bg-muted/30">
                  <div className="text-sm">
                    <p className="font-medium">{r.employee_name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee_email} • {r.contract?.position || '—'} • Approved {r.approved_at ? new Date(r.approved_at).toLocaleDateString() : '—'}</p>
                  </div>
                  <Button size="sm" onClick={() => resendEmail(r)} disabled={resending === r.id || !r.contract}>
                    {resending === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send email'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractRenewalApprovals;