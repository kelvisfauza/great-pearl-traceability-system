import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Mail, MessageSquare, Save, Search } from 'lucide-react';

// Full list of transactional templates (kept in sync with
// supabase/functions/_shared/transactional-email-templates/registry.ts)
const TEMPLATES: { key: string; label: string; category: string }[] = [
  { key: 'verification-code', label: 'Verification code (OTP)', category: 'Auth' },
  { key: 'password-reset-temp', label: 'Password reset (temporary)', category: 'Auth' },
  { key: 'new-device-alert', label: 'New device login alert', category: 'Auth' },
  { key: 'withdrawal-verification', label: 'Withdrawal verification code', category: 'Wallet' },
  { key: 'withdrawal-auth-request', label: 'Withdrawal authorization request', category: 'Wallet' },
  { key: 'instant-withdrawal-approval-request', label: 'Instant withdrawal approval request', category: 'Wallet' },
  { key: 'instant-withdrawal-confirmation', label: 'Instant withdrawal confirmation', category: 'Wallet' },
  { key: 'cash-withdrawal-confirmation', label: 'Cash withdrawal confirmation', category: 'Wallet' },
  { key: 'admin-withdrawal-pin', label: 'Admin withdrawal PIN', category: 'Wallet' },
  { key: 'admin-withdrawal-confirmed', label: 'Admin withdrawal confirmed', category: 'Wallet' },
  { key: 'wallet-transfer', label: 'Wallet-to-wallet transfer', category: 'Wallet' },
  { key: 'wallet-deposit-credited', label: 'Wallet deposit credited', category: 'Wallet' },
  { key: 'transaction-statement', label: 'Transaction statement', category: 'Wallet' },
  { key: 'payment-receipt', label: 'Payment receipt', category: 'Wallet' },
  { key: 'allowance-credited', label: 'Allowance credited', category: 'Payroll' },
  { key: 'salary-credited', label: 'Salary credited', category: 'Payroll' },
  { key: 'salary-advance-confirmation', label: 'Salary advance confirmation', category: 'Payroll' },
  { key: 'salary-reduction-notice', label: 'Salary reduction notice', category: 'Payroll' },
  { key: 'payroll-deductions-notice', label: 'Payroll deductions notice', category: 'Payroll' },
  { key: 'overtime-reward', label: 'Overtime reward', category: 'Payroll' },
  { key: 'bonus-claimed', label: 'Bonus claimed', category: 'Payroll' },
  { key: 'loan-approval-details', label: 'Loan approval details', category: 'Loans' },
  { key: 'loan-rejected', label: 'Loan rejected', category: 'Loans' },
  { key: 'loan-counter-offer', label: 'Loan counter-offer', category: 'Loans' },
  { key: 'loan-guarantor-code', label: 'Loan guarantor code', category: 'Loans' },
  { key: 'loan-guarantor-response', label: 'Loan guarantor response', category: 'Loans' },
  { key: 'loan-guarantor-revoked', label: 'Loan guarantor revoked', category: 'Loans' },
  { key: 'loan-repayment', label: 'Loan repayment', category: 'Loans' },
  { key: 'loan-reminder', label: 'Loan reminder', category: 'Loans' },
  { key: 'loan-appeal-approved', label: 'Loan appeal approved', category: 'Loans' },
  { key: 'loan-promotion', label: 'Loan promotion', category: 'Loans' },
  { key: 'guarantor-recovery', label: 'Guarantor recovery notice', category: 'Loans' },
  { key: 'overdraft-qualification', label: 'Overdraft qualification', category: 'Overdraft' },
  { key: 'overdraft-penalty-warning', label: 'Overdraft penalty warning', category: 'Overdraft' },
  { key: 'investment-confirmation', label: 'Investment confirmation', category: 'Invest & Earn' },
  { key: 'investment-matured', label: 'Investment matured', category: 'Invest & Earn' },
  { key: 'approval-action', label: 'Approval action', category: 'Approvals' },
  { key: 'request-expired-refund', label: 'Request expired / refund', category: 'Approvals' },
  { key: 'price-update', label: 'Price update', category: 'Pricing' },
  { key: 'price-approval-request', label: 'Price approval request', category: 'Pricing' },
  { key: 'price-reminder', label: 'Price reminder', category: 'Pricing' },
  { key: 'supplier-price-notice', label: 'Supplier price notice', category: 'Suppliers' },
  { key: 'supplier-contract-notice', label: 'Supplier contract notice', category: 'Suppliers' },
  { key: 'supplier-update-notice', label: 'Supplier update notice', category: 'Suppliers' },
  { key: 'task-assignment', label: 'Task assignment', category: 'Operations' },
  { key: 'meal-disbursement-notification', label: 'Meal disbursement', category: 'Operations' },
  { key: 'job-application-status', label: 'Job application status', category: 'HR' },
  { key: 'title-change-confirmation', label: 'Title / role change', category: 'HR' },
  { key: 'employee-of-the-month', label: 'Employee of the month', category: 'HR' },
  { key: 'general-notification', label: 'General notification', category: 'System' },
  { key: 'system-update-announcement', label: 'System update announcement', category: 'System' },
  { key: 'daily-admin-summary', label: 'Daily admin summary', category: 'Daily Digests' },
  { key: 'daily-ops-summary', label: 'Daily ops summary', category: 'Daily Digests' },
  { key: 'daily-finance-summary', label: 'Daily finance summary', category: 'Daily Digests' },
  { key: 'daily-sales-summary', label: 'Daily sales summary', category: 'Daily Digests' },
  { key: 'daily-quality-summary', label: 'Daily quality summary', category: 'Daily Digests' },
  { key: 'daily-inventory-summary', label: 'Daily inventory summary', category: 'Daily Digests' },
  { key: 'daily-eudr-summary', label: 'Daily EUDR summary', category: 'Daily Digests' },
  { key: 'daily-procurement-summary', label: 'Daily procurement summary', category: 'Daily Digests' },
  { key: 'daily-wallet-summary', label: 'Daily wallet summary', category: 'Daily Digests' },
  { key: 'easter-greeting', label: 'Easter greeting', category: 'Holidays' },
  { key: 'happy-eid', label: 'Happy Eid', category: 'Holidays' },
  { key: 'labour-day-2026', label: 'Labour Day', category: 'Holidays' },
  { key: 'labour-day-closure-employees', label: 'Labour Day closure (employees)', category: 'Holidays' },
  { key: 'labour-day-closure-suppliers', label: 'Labour Day closure (suppliers)', category: 'Holidays' },
  { key: 'public-holiday-closure', label: 'Public holiday closure', category: 'Holidays' },
];

interface PrefRow { template_name: string; channels: string[]; enabled: boolean; }

const DEFAULT: PrefRow = { template_name: '', channels: ['email', 'sms'], enabled: true };

const NotificationChannelPrefs = () => {
  const [prefs, setPrefs] = useState<Record<string, PrefRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('notification_channel_prefs' as any).select('*') as any);
    if (error) { toast({ title: 'Failed to load', description: error.message, variant: 'destructive' }); setLoading(false); return; }
    const map: Record<string, PrefRow> = {};
    (data || []).forEach((r: any) => { map[r.template_name] = { template_name: r.template_name, channels: r.channels || [], enabled: r.enabled }; });
    setPrefs(map);
    setDirty(new Set());
    setLoading(false);
  };

  const getRow = (key: string): PrefRow => prefs[key] || { ...DEFAULT, template_name: key };

  const update = (key: string, patch: Partial<PrefRow>) => {
    setPrefs(p => ({ ...p, [key]: { ...getRow(key), ...patch } }));
    setDirty(d => new Set(d).add(key));
  };

  const toggleChannel = (key: string, ch: 'email' | 'sms', on: boolean) => {
    const cur = getRow(key).channels;
    const next = on ? Array.from(new Set([...cur, ch])) : cur.filter(c => c !== ch);
    update(key, { channels: next });
  };

  const saveOne = async (key: string) => {
    setSaving(key);
    const row = getRow(key);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase.from('notification_channel_prefs' as any).upsert({
      template_name: key,
      channels: row.channels,
      enabled: row.enabled,
      updated_by: userData?.user?.id,
    } as any, { onConflict: 'template_name' }) as any);
    setSaving(null);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    setDirty(d => { const n = new Set(d); n.delete(key); return n; });
    toast({ title: 'Saved', description: `${key} preferences updated` });
  };

  const saveAll = async () => {
    const keys = Array.from(dirty);
    if (!keys.length) return;
    setSaving('__all__');
    const { data: userData } = await supabase.auth.getUser();
    const payload = keys.map(k => {
      const r = getRow(k);
      return { template_name: k, channels: r.channels, enabled: r.enabled, updated_by: userData?.user?.id };
    });
    const { error } = await (supabase.from('notification_channel_prefs' as any).upsert(payload as any, { onConflict: 'template_name' }) as any);
    setSaving(null);
    if (error) { toast({ title: 'Bulk save failed', description: error.message, variant: 'destructive' }); return; }
    setDirty(new Set());
    toast({ title: 'All changes saved', description: `${keys.length} template(s) updated` });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TEMPLATES;
    return TEMPLATES.filter(t => t.key.includes(q) || t.label.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof TEMPLATES> = {};
    filtered.forEach(t => { (g[t.category] ||= []).push(t); });
    return g;
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Notification Channels</CardTitle>
        <CardDescription>
          Choose which channel each system message uses. Defaults to <Badge variant="secondary" className="mx-1">Email + SMS</Badge>.
          Uncheck a channel to stop that message from going out on it. Toggle off entirely to mute a template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button onClick={saveAll} disabled={!dirty.size || saving === '__all__'} className="gap-2">
            {saving === '__all__' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {dirty.size ? `(${dirty.size})` : 'all'}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="border rounded-md overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">{cat}</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-24 text-center"><span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />Email</span></TableHead>
                    <TableHead className="w-24 text-center"><span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />SMS</span></TableHead>
                    <TableHead className="w-28 text-center">Enabled</TableHead>
                    <TableHead className="w-24 text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(t => {
                    const row = getRow(t.key);
                    const isDirty = dirty.has(t.key);
                    return (
                      <TableRow key={t.key} className={isDirty ? 'bg-amber-50 dark:bg-amber-900/10' : ''}>
                        <TableCell>
                          <div className="font-medium text-sm">{t.label}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{t.key}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={row.channels.includes('email')} disabled={!row.enabled}
                            onCheckedChange={v => toggleChannel(t.key, 'email', !!v)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox checked={row.channels.includes('sms')} disabled={!row.enabled}
                            onCheckedChange={v => toggleChannel(t.key, 'sms', !!v)} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={row.enabled} onCheckedChange={v => update(t.key, { enabled: v })} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant={isDirty ? 'default' : 'ghost'} disabled={!isDirty || saving === t.key}
                            onClick={() => saveOne(t.key)}>
                            {saving === t.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationChannelPrefs;
