import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, Printer, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Employee } from '@/hooks/useSupabaseEmployees';

interface PrintLoginDetailsProps {
  employees: Employee[];
}

function generatePassword() {
  const words = ['Coffee', 'Harvest', 'Kasese', 'Arabica', 'Robusta', 'Highland'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}@${num}`;
}

export default function PrintLoginDetails({ employees }: PrintLoginDetailsProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const employee = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId]
  );

  const printSlip = (emp: Employee, pwd: string) => {
    const html = `
      <!DOCTYPE html><html><head><title>Login Details - ${emp.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 28px; color: #1f2937; }
        .header { text-align: center; margin-bottom: 24px; }
        .company { font-size: 20px; font-weight: bold; color: #0d3d1f; }
        .sub { font-size: 12px; color: #6b7280; }
        .title { margin-top: 12px; font-size: 16px; font-weight: bold; }
        .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 18px; max-width: 520px; margin: 0 auto; }
        .row { display: flex; margin: 10px 0; }
        .label { width: 170px; font-weight: bold; }
        .value { flex: 1; font-family: monospace; }
        .note { max-width: 520px; margin: 22px auto 0; font-size: 12px; color: #6b7280; }
        .sign { margin-top: 42px; display: flex; justify-content: space-between; max-width: 520px; margin-left: auto; margin-right: auto; }
        .sign div { border-top: 1px solid #9ca3af; width: 45%; text-align: center; font-size: 12px; padding-top: 6px; }
      </style></head><body>
        <div class="header">
          <div class="company">Great Agro Coffee</div>
          <div class="sub">A member of Hello YEDA COFFEE COMPANY LIMITED — P.O Box 431420, Kasese, Uganda</div>
          <div class="title">Confidential Login Details</div>
          <div class="sub">Issued on ${new Date().toLocaleString()}</div>
        </div>
        <div class="box">
          <div class="row"><div class="label">Name:</div><div class="value">${emp.name}</div></div>
          <div class="row"><div class="label">Position:</div><div class="value">${emp.position || '-'}</div></div>
          <div class="row"><div class="label">Department:</div><div class="value">${emp.department || '-'}</div></div>
          <div class="row"><div class="label">Role:</div><div class="value">${emp.role || '-'}</div></div>
          <div class="row"><div class="label">Login email:</div><div class="value">${emp.email}</div></div>
          <div class="row"><div class="label">Temporary password:</div><div class="value">${pwd}</div></div>
        </div>
        <div class="note">
          Keep this slip confidential. Sign in at the system web address using the email and temporary
          password above, then change the password immediately. Sharing this slip or these details with
          anyone else is prohibited.
        </div>
        <div class="sign"><div>Issued by</div><div>Received by</div></div>
      </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Print blocked', description: 'Allow pop-ups to print the slip.', variant: 'destructive' });
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handleCreateAndPrint = async () => {
    if (!employee) {
      toast({ title: 'Select a person', description: 'Choose who the login is for.', variant: 'destructive' });
      return;
    }
    if (!employee.email || !employee.email.includes('@')) {
      toast({ title: 'No email on file', description: 'Add a valid email to their record first.', variant: 'destructive' });
      return;
    }
    if (password.trim().length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      // Try updating an existing login first.
      const reset = await supabase.functions.invoke('reset-user-password', {
        body: { email: employee.email, newPassword: password },
      });

      const resetFailed = Boolean(reset.error || (reset.data && reset.data.error));
      const notFound =
        resetFailed &&
        String(reset.data?.error || reset.error?.message || '').toLowerCase().includes('not found');

      if (resetFailed && !notFound) {
        throw new Error(
          reset.data?.error ||
            reset.error?.message ||
            'The password could not be saved. Ask an administrator to set it.'
        );
      }

      if (resetFailed) {
        // No login yet — create one and link it to the existing staff record.
        const create = await supabase.functions.invoke('create-user', {
          body: {
            linkExisting: true,
            employeeData: {
              name: employee.name,
              email: employee.email,
              password,
              phone: employee.phone || '',
              position: employee.position || '',
              department: employee.department || '',
              role: employee.role || 'User',
              salary: Number((employee as any).salary) || 0,
              permissions: Array.isArray((employee as any).permissions) ? (employee as any).permissions : [],
            },
          },
        });
        if (create.error) throw new Error(create.error.message);
        if (create.data && create.data.success === false) throw new Error(create.data.error || 'Could not create the login');
        if (create.data?.alreadyLinked) {
          throw new Error(
            'This person already has a login, but the new password was not saved. Ask an administrator to set it.'
          );
        }
      }

      toast({ title: 'Login ready', description: `${employee.name} can now sign in with ${employee.email}.` });
      printSlip(employee, password);
    } catch (e) {
      toast({ title: 'Could not set up the login', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Create Login &amp; Print Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Staff member</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose who needs a login" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} — {e.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {employee && (
          <p className="text-sm text-muted-foreground">
            Login email: <span className="font-mono">{employee.email}</span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="temp-password">Temporary password</Label>
          <div className="flex gap-2">
            <Input
              id="temp-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleCreateAndPrint} disabled={busy || !employeeId} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            {busy ? 'Setting up...' : 'Set password & print slip'}
          </Button>
          <Button
            variant="outline"
            disabled={!employee}
            onClick={() => employee && printSlip(employee, password)}
          >
            Print slip only
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          The slip is confidential — hand it to the person directly and ask them to change the password
          after their first sign-in.
        </p>
      </CardContent>
    </Card>
  );
}
