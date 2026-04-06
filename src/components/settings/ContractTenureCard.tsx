import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarDays, Clock, AlertTriangle, CheckCircle, XCircle, Plus, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInMonths, addMonths } from 'date-fns';

interface ContractTenureCardProps {
  employee: any;
  isAdmin?: boolean;
}

interface ContractInfo {
  id: string;
  contract_start_date: string;
  contract_end_date: string | null;
  contract_type: string;
  status: string;
  renewal_count: number;
  contract_duration_months: number | null;
  position?: string;
  department?: string;
  salary?: number;
  notes?: string;
}

const CONTRACT_TYPES = ['Fixed Term', 'Permanent', 'Probation', 'Casual', 'Internship'];
const DURATIONS = [3, 6, 12, 18, 24, 36];

const ContractTenureCard = ({ employee, isAdmin = false }: ContractTenureCardProps) => {
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [allContracts, setAllContracts] = useState<ContractInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    contract_type: 'Fixed Term',
    duration_months: 6,
    start_date: new Date().toISOString().split('T')[0],
    position: '',
    department: '',
    salary: 0,
    notes: '',
  });

  const [renewData, setRenewData] = useState({
    duration_months: 6,
    notes: '',
  });

  useEffect(() => {
    if (!employee?.email) return;
    fetchContracts();
  }, [employee?.email]);

  useEffect(() => {
    if (employee) {
      setFormData(prev => ({
        ...prev,
        position: employee.position || '',
        department: employee.department || '',
        salary: employee.salary || 0,
        start_date: employee.join_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      }));
    }
  }, [employee]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_contracts')
        .select('id, contract_start_date, contract_end_date, contract_type, status, renewal_count, contract_duration_months, position, department, salary, notes')
        .eq('employee_email', employee.email)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const contracts = (data || []) as ContractInfo[];
      setAllContracts(contracts);

      if (contracts.length > 0) {
        // Get latest active or most recent
        const active = contracts.find(c => c.status === 'Active') || contracts[0];
        setContract(active);
      } else {
        // Derive default 6-month contract from join_date
        const joinDate = employee.join_date || employee.created_at;
        if (joinDate) {
          const start = new Date(joinDate);
          const end = addMonths(start, 6);
          setContract({
            id: 'derived',
            contract_start_date: start.toISOString().split('T')[0],
            contract_end_date: end.toISOString().split('T')[0],
            contract_type: 'Fixed Term',
            status: end < new Date() ? 'Expired' : 'Active',
            renewal_count: 0,
            contract_duration_months: 6,
            position: employee.position,
            department: employee.department,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      const startDate = new Date(formData.start_date);
      const endDate = addMonths(startDate, formData.duration_months);

      const contractRecord = {
        employee_id: employee.id || employee.employee_id || '',
        employee_name: employee.name,
        employee_email: employee.email,
        employee_gac_id: employee.employee_id || null,
        contract_type: formData.contract_type,
        position: formData.position || employee.position,
        department: formData.department || employee.department,
        contract_start_date: formData.start_date,
        contract_end_date: endDate.toISOString().split('T')[0],
        contract_duration_months: formData.duration_months,
        salary: formData.salary || employee.salary || 0,
        status: 'Active',
        renewal_count: 0,
        notes: formData.notes || `Initial ${formData.duration_months}-month contract`,
        created_by: 'System',
      };

      const { error } = await supabase
        .from('employee_contracts')
        .insert([contractRecord as any]);

      if (error) throw error;

      toast({ title: "Success", description: `Contract created for ${employee.name}` });
      setShowCreateDialog(false);
      await fetchContracts();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast({ title: "Error", description: error.message || "Failed to create contract", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRenewContract = async () => {
    if (!contract || contract.id === 'derived') return;
    setSaving(true);
    try {
      // Mark current as renewed
      await supabase
        .from('employee_contracts')
        .update({ status: 'Renewed' } as any)
        .eq('id', contract.id);

      const newStartDate = contract.contract_end_date || new Date().toISOString().split('T')[0];
      const newEndDate = addMonths(new Date(newStartDate), renewData.duration_months);

      const renewedContract = {
        employee_id: employee.id || employee.employee_id || '',
        employee_name: employee.name,
        employee_email: employee.email,
        employee_gac_id: employee.employee_id || null,
        contract_type: contract.contract_type,
        position: contract.position || employee.position,
        department: contract.department || employee.department,
        contract_start_date: newStartDate,
        contract_end_date: newEndDate.toISOString().split('T')[0],
        contract_duration_months: renewData.duration_months,
        salary: contract.salary || employee.salary || 0,
        status: 'Active',
        renewal_count: (contract.renewal_count || 0) + 1,
        renewed_from_id: contract.id,
        notes: renewData.notes || `Renewal #${(contract.renewal_count || 0) + 1}`,
        created_by: 'System',
      };

      const { error } = await supabase
        .from('employee_contracts')
        .insert([renewedContract as any]);

      if (error) throw error;

      toast({ title: "Success", description: `Contract renewed for ${employee.name}` });
      setShowRenewDialog(false);
      await fetchContracts();
    } catch (error: any) {
      console.error('Error renewing contract:', error);
      toast({ title: "Error", description: error.message || "Failed to renew contract", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading contract info...
        </CardContent>
      </Card>
    );
  }

  // No contract at all and no join_date
  if (!contract) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Contract & Tenure
          </CardTitle>
          <CardDescription>No contract record found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              No employment contract has been created for this employee yet.
            </p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contract
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Contract for {employee?.name}</DialogTitle>
                  <DialogDescription>Set up an employment contract</DialogDescription>
                </DialogHeader>
                {renderContractForm()}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startDate = new Date(contract.contract_start_date);
  const endDate = contract.contract_end_date ? new Date(contract.contract_end_date) : null;
  const now = new Date();

  // Tenure calculation from join_date (overall tenure, not just this contract)
  const joinDate = new Date(employee.join_date || employee.created_at || contract.contract_start_date);
  const tenureMonths = differenceInMonths(now, joinDate);
  const tenureYears = Math.floor(tenureMonths / 12);
  const tenureRemainingMonths = tenureMonths % 12;
  const tenureLabel = tenureYears > 0
    ? `${tenureYears} year${tenureYears > 1 ? 's' : ''}, ${tenureRemainingMonths} month${tenureRemainingMonths !== 1 ? 's' : ''}`
    : `${tenureMonths} month${tenureMonths !== 1 ? 's' : ''}`;

  // Contract progress & status
  let daysRemaining = 0;
  let progressPercent = 100;
  let statusColor: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';
  let statusIcon = <CheckCircle className="h-4 w-4" />;
  let statusLabel = contract.status;
  const isDerived = contract.id === 'derived';

  if (endDate) {
    const totalDays = Math.max(1, differenceInDays(endDate, startDate));
    const elapsed = differenceInDays(now, startDate);
    progressPercent = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
    daysRemaining = differenceInDays(endDate, now);

    if (daysRemaining < 0) {
      statusLabel = 'Expired';
      statusColor = 'destructive';
      statusIcon = <XCircle className="h-4 w-4" />;
    } else if (daysRemaining <= 30) {
      statusLabel = 'Expiring Soon';
      statusColor = 'secondary';
      statusIcon = <AlertTriangle className="h-4 w-4" />;
    } else {
      statusLabel = 'Active';
      statusColor = 'default';
      statusIcon = <CheckCircle className="h-4 w-4" />;
    }
  }

  function renderContractForm() {
    return (
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Contract Type</Label>
            <Select value={formData.contract_type} onValueChange={v => setFormData(p => ({ ...p, contract_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (months)</Label>
            <Select value={String(formData.duration_months)} onValueChange={v => setFormData(p => ({ ...p, duration_months: Number(v) }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} months</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Position</Label>
            <Input value={formData.position} onChange={e => setFormData(p => ({ ...p, position: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Department</Label>
            <Input value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Salary (UGX)</Label>
          <Input type="number" value={formData.salary} onChange={e => setFormData(p => ({ ...p, salary: Number(e.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
        </div>
        <Button onClick={handleCreateContract} disabled={saving} className="w-full">
          {saving ? 'Creating...' : 'Create Contract'}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Contract & Tenure
            </CardTitle>
            <CardDescription>
              {isDerived ? 'Auto-derived from join date (no formal contract on file)' : 'Employment contract details'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isDerived && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Contract for {employee?.name}</DialogTitle>
                    <DialogDescription>Set up a formal employment contract</DialogDescription>
                  </DialogHeader>
                  {renderContractForm()}
                </DialogContent>
              </Dialog>
            )}
            {!isDerived && (statusLabel === 'Expired' || statusLabel === 'Expiring Soon') && (
              <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Renew
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Renew Contract</DialogTitle>
                    <DialogDescription>Renew contract for {employee?.name}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">New Duration (months)</Label>
                      <Select value={String(renewData.duration_months)} onValueChange={v => setRenewData(p => ({ ...p, duration_months: Number(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} months</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Notes</Label>
                      <Input value={renewData.notes} onChange={e => setRenewData(p => ({ ...p, notes: e.target.value }))} placeholder="Renewal notes..." />
                    </div>
                    <Button onClick={handleRenewContract} disabled={saving} className="w-full">
                      {saving ? 'Renewing...' : 'Renew Contract'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {allContracts.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>
                <FileText className="h-4 w-4 mr-1" />
                History ({allContracts.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status & Tenure Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusColor} className="flex items-center gap-1.5 text-sm px-3 py-1">
            {statusIcon}
            {statusLabel}
          </Badge>
          {isDerived && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed">
              Provisional
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1.5 text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            Tenure: {tenureLabel}
          </Badge>
          {contract.renewal_count > 0 && (
            <Badge variant="outline" className="text-sm px-3 py-1">
              Renewed {contract.renewal_count}×
            </Badge>
          )}
        </div>

        {/* Contract Progress */}
        {endDate && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Contract Progress</span>
              <span>
                {daysRemaining > 0
                  ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                  : `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2.5" />
          </div>
        )}

        {/* Contract Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Contract Type</p>
            <p className="text-sm font-semibold">{contract.contract_type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Duration</p>
            <p className="text-sm font-semibold">{contract.contract_duration_months || 6} months</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Start Date</p>
            <p className="text-sm font-semibold">{format(startDate, 'dd MMM yyyy')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">End Date</p>
            <p className="text-sm font-semibold">
              {endDate ? format(endDate, 'dd MMM yyyy') : 'Indefinite'}
            </p>
          </div>
        </div>

        {/* Expiry Warning */}
        {daysRemaining <= 30 && daysRemaining > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Contract Expiring Soon</p>
              <p className="text-xs mt-0.5">
                Your contract expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
                Please contact HR for renewal.
              </p>
            </div>
          </div>
        )}

        {daysRemaining < 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Contract Expired</p>
              <p className="text-xs mt-0.5">
                Your contract expired {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago. 
                Please contact HR immediately for renewal.
              </p>
            </div>
          </div>
        )}

        {/* Contract History */}
        {showHistory && allContracts.length > 1 && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Contract History</p>
            {allContracts.map((c, i) => (
              <div key={c.id} className={`flex items-center justify-between p-2 rounded text-sm ${i === 0 ? 'bg-muted/50' : ''}`}>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === 'Active' ? 'default' : c.status === 'Expired' ? 'destructive' : 'secondary'} className="text-xs">
                    {c.status}
                  </Badge>
                  <span>{c.contract_type}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{c.contract_duration_months || 6}mo</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {format(new Date(c.contract_start_date), 'dd MMM yyyy')} → {c.contract_end_date ? format(new Date(c.contract_end_date), 'dd MMM yyyy') : '∞'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractTenureCard;
