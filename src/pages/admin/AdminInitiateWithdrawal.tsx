import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Clock, CheckCircle, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const AdminInitiateWithdrawal = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});
  const [selectedBalance, setSelectedBalance] = useState<number | null>(null);

  useEffect(() => {
    fetchEmployees();
    fetchWithdrawals();
    fetchWalletBalances();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, email, department, position')
      .eq('status', 'Active')
      .order('name');
    const empList = data || [];
    setEmployees(empList);
    // Fetch balances after employees are loaded
    fetchWalletBalances(empList);
  };

  const fetchWalletBalances = async (empList?: any[]) => {
    try {
      const list = empList || employees;
      if (!list.length) return;

      const balanceMap: Record<string, number> = {};

      // Fetch balances for all employees using their emails
      const promises = list.map(async (emp: any) => {
        const { data } = await supabase.rpc('get_user_balance_safe', { user_email: emp.email });
        const row = data?.[0];
        if (row) {
          balanceMap[emp.id] = Number(row.wallet_balance) || 0;
        } else {
          balanceMap[emp.id] = 0;
        }
      });

      await Promise.all(promises);
      setWalletBalances(balanceMap);
    } catch (err) {
      console.error('Error fetching wallet balances:', err);
    }
  };

  const fetchWithdrawals = async () => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('admin_initiated_withdrawals' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setWithdrawals((data as any[]) || []);
    setLoadingHistory(false);
  };

  const generatePin = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // Update selected balance when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      const bal = walletBalances[selectedEmployee];
      setSelectedBalance(bal !== undefined ? bal : null);
    } else {
      setSelectedBalance(null);
    }
  }, [selectedEmployee, walletBalances]);

  const handleInitiate = async () => {
    if (!selectedEmployee || !amount || !reason) {
      toast({ title: 'Missing fields', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployee);
    if (!emp) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      toast({ title: 'Invalid amount', description: 'Minimum withdrawal is UGX 1,000', variant: 'destructive' });
      return;
    }

    // Check balance
    const balance = walletBalances[selectedEmployee] || 0;
    if (numAmount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: `${emp.name} has UGX ${balance.toLocaleString()} but you're trying to withdraw UGX ${numAmount.toLocaleString()}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const pin = generatePin();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('admin_initiated_withdrawals' as any)
        .insert({
          employee_id: emp.id,
          employee_email: emp.email,
          employee_name: emp.name,
          amount: numAmount,
          reason,
          pin_code: pin,
          pin_expires_at: expiresAt,
          status: 'pending_pin',
          initiated_by: employee?.email || 'admin',
          initiated_by_name: employee?.name || 'Admin',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'admin-withdrawal-pin',
          recipientEmail: emp.email,
          idempotencyKey: `admin-wd-pin-${(data as any).id}`,
          templateData: {
            name: emp.name,
            code: pin,
            amount: numAmount.toLocaleString(),
            reason,
            initiatedBy: employee?.name || 'Admin',
          },
        },
      });

      toast({
        title: 'Withdrawal Initiated',
        description: `PIN sent to ${emp.name}'s email. Awaiting their confirmation.`,
      });

      setSelectedEmployee('');
      setAmount('');
      setReason('');
      fetchWithdrawals();
    } catch (err: any) {
      console.error('Error initiating withdrawal:', err);
      toast({ title: 'Error', description: err.message || 'Failed to initiate withdrawal', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_pin':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Awaiting PIN</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Admin Initiate Withdrawal</h1>
          <p className="text-muted-foreground text-sm">Withdraw funds from a user's wallet with their PIN confirmation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Initiate Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              New Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} — {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show wallet balance for selected employee */}
            {selectedEmployee && (
              <div className={`rounded-lg p-3 flex items-center gap-2 ${
                selectedBalance !== null && selectedBalance > 0
                  ? 'bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800'
                  : 'bg-destructive/10 border border-destructive/30'
              }`}>
                <Wallet className="h-4 w-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className={`font-bold text-sm ${
                    selectedBalance !== null && selectedBalance > 0
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-destructive'
                  }`}>
                    {selectedBalance !== null
                      ? `UGX ${selectedBalance.toLocaleString()}`
                      : 'UGX 0'}
                  </p>
                  {(selectedBalance === null || selectedBalance <= 0) && (
                    <p className="text-xs text-destructive font-medium">Insufficient balance</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label>Amount (UGX)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1000}
              />
              {amount && selectedBalance !== null && parseFloat(amount) > selectedBalance && (
                <p className="text-xs text-destructive mt-1">⚠️ Amount exceeds available balance</p>
              )}
            </div>

            <div>
              <Label>Reason</Label>
              <Textarea
                placeholder="Why is this withdrawal being initiated?"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleInitiate}
              disabled={loading || !selectedEmployee || !amount || !reason || (selectedBalance !== null && parseFloat(amount) > selectedBalance)}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending PIN...' : 'Initiate & Send PIN'}
            </Button>

            <p className="text-xs text-muted-foreground">
              A 5-digit PIN will be sent to the employee's email. They must enter it on their dashboard to confirm. PIN expires in 10 minutes.
            </p>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : withdrawals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No admin-initiated withdrawals yet.</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {withdrawals.map((w: any) => (
                  <div key={w.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{w.employee_name}</p>
                      <p className="text-xs text-muted-foreground">
                        UGX {Number(w.amount).toLocaleString()} — {w.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        By {w.initiated_by_name} • {format(new Date(w.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                    {getStatusBadge(w.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminInitiateWithdrawal;
