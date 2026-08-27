import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GRN_INPUT_PERMISSIONS, GRN_INPUT_BLOCKED_PERMISSIONS } from '@/hooks/useGrnInputRole';

interface Emp {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  permissions: string[] | null;
}

const hasGrnInputRole = (perms: string[] | null) => {
  const p = perms || [];
  if (p.includes('*')) return false;
  const scan = p.includes('Finance:view') || p.includes('Finance:create');
  const release = GRN_INPUT_BLOCKED_PERMISSIONS.some((b) => p.includes(b));
  return scan && !release;
};

const GrnInputRoleManager = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['grn-input-role-employees'],
    queryFn: async (): Promise<Emp[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, department, position, permissions')
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as Emp[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? employees.filter((e) =>
          [e.name, e.email, e.department, e.position].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
        )
      : employees;
    return [...list].sort((a, b) => Number(hasGrnInputRole(b.permissions)) - Number(hasGrnInputRole(a.permissions)));
  }, [employees, search]);

  const update = async (emp: Emp, grant: boolean) => {
    setBusy(emp.id);
    try {
      const current = new Set((emp.permissions || []).filter((p) => p !== '*'));
      if (grant) {
        GRN_INPUT_BLOCKED_PERMISSIONS.forEach((p) => current.delete(p));
        GRN_INPUT_PERMISSIONS.forEach((p) => current.add(p));
      } else {
        GRN_INPUT_PERMISSIONS.forEach((p) => current.delete(p));
      }
      const { error } = await supabase
        .from('employees')
        .update({ permissions: Array.from(current), updated_at: new Date().toISOString() } as any)
        .eq('id', emp.id);
      if (error) throw error;
      toast({
        title: grant ? 'GRN Input role granted' : 'GRN Input role removed',
        description: `${emp.name} ${grant ? 'can now scan and submit GRNs for payment.' : 'no longer has finance scan access.'}`,
      });
      qc.invalidateQueries({ queryKey: ['grn-input-role-employees'] });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || 'Could not update permissions', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" /> GRN Input Officers (Finance scan-only)
        </CardTitle>
        <CardDescription>
          Award the role Timothy and Kibaba hold: scan GRNs and submit them to a finance approver for payment. They
          cannot release payments, approve, or view payment history, advances, reports, duplicates, cash balance or
          other staff&apos;s referrals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, email or department…"
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((emp) => {
                  const active = hasGrnInputRole(emp.permissions);
                  const isFullFinance = (emp.permissions || []).some(
                    (p) => p === '*' || GRN_INPUT_BLOCKED_PERMISSIONS.includes(p)
                  );
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="text-sm">
                        <span className="font-medium">{emp.name}</span>
                        <span className="block text-xs text-muted-foreground">{emp.email}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {emp.department || '—'}
                      </TableCell>
                      <TableCell>
                        {active ? (
                          <Badge className="bg-green-600 text-[10px]">GRN INPUT</Badge>
                        ) : isFullFinance ? (
                          <Badge variant="secondary" className="text-[10px]">FULL FINANCE</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">NO FINANCE</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={active ? 'outline' : 'default'}
                          className="gap-1"
                          disabled={busy === emp.id}
                          onClick={() => update(emp, !active)}
                        >
                          {busy === emp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : active ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {active ? 'Remove role' : 'Award role'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GrnInputRoleManager;
