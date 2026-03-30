import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeContracts, EmployeeContract } from '@/hooks/useEmployeeContracts';
import { useSupabaseEmployees } from '@/hooks/useSupabaseEmployees';
import { format, differenceInDays, differenceInMonths } from 'date-fns';
import { FileText, AlertTriangle, Clock, RefreshCw, Plus, Calendar, User, Building2, Search } from 'lucide-react';

const EmployeeContractsManager = () => {
  const { contracts, loading, addContract, renewContract, getExpiringContracts, getExpiredContracts } = useEmployeeContracts();
  const { employees } = useSupabaseEmployees();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<EmployeeContract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Add contract form state
  const [formData, setFormData] = useState({
    employee_id: '',
    contract_type: 'Fixed-Term',
    contract_start_date: '',
    contract_end_date: '',
    contract_duration_months: 6,
    notes: '',
  });

  // Renew form state
  const [renewData, setRenewData] = useState({
    new_end_date: '',
    duration_months: 6,
  });

  const expiringContracts = getExpiringContracts(30);
  const expiredContracts = getExpiredContracts();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'default';
      case 'Expired': return 'destructive';
      case 'Renewed': return 'secondary';
      case 'Terminated': return 'destructive';
      case 'Pending Renewal': return 'outline';
      default: return 'outline';
    }
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  const getTimeWithUs = (startDate: string) => {
    const months = differenceInMonths(new Date(), new Date(startDate));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years > 0) return `${years}y ${remainingMonths}m`;
    return `${remainingMonths}m`;
  };

  const handleAddContract = async () => {
    const emp = employees.find(e => e.id === formData.employee_id);
    if (!emp) return;

    await addContract({
      employee_id: emp.id,
      employee_name: emp.name,
      employee_email: emp.email,
      employee_gac_id: emp.employee_id || null,
      contract_type: formData.contract_type,
      position: emp.position,
      department: emp.department,
      contract_start_date: formData.contract_start_date,
      contract_end_date: formData.contract_end_date || null,
      contract_duration_months: formData.contract_duration_months,
      salary: emp.salary,
      status: 'Active',
      renewal_count: 0,
      renewed_from_id: null,
      notes: formData.notes || null,
      document_url: null,
      created_by: 'Admin',
    });

    setShowAddModal(false);
    setFormData({ employee_id: '', contract_type: 'Fixed-Term', contract_start_date: '', contract_end_date: '', contract_duration_months: 6, notes: '' });
  };

  const handleRenew = async () => {
    if (!selectedContract) return;
    await renewContract(selectedContract.id, renewData.new_end_date, renewData.duration_months);
    setShowRenewModal(false);
    setSelectedContract(null);
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.employee_gac_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Auto-detect expired
  const activeButExpired = contracts.filter(c => {
    if (c.status !== 'Active' || !c.contract_end_date) return false;
    return new Date(c.contract_end_date) < new Date();
  });

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(expiringContracts.length > 0 || activeButExpired.length > 0) && (
        <div className="space-y-3">
          {activeButExpired.length > 0 && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  {activeButExpired.length} Contract(s) Expired!
                </div>
                <div className="space-y-1">
                  {activeButExpired.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span>{c.employee_name} ({c.employee_gac_id}) - {c.contract_type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-destructive">Expired {format(new Date(c.contract_end_date!), 'dd MMM yyyy')}</span>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedContract(c); setShowRenewModal(true); }}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Renew
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {expiringContracts.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-2">
                  <Clock className="h-5 w-5" />
                  {expiringContracts.length} Contract(s) Expiring Within 30 Days
                </div>
                <div className="space-y-1">
                  {expiringContracts.map(c => {
                    const days = getDaysRemaining(c.contract_end_date);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span>{c.employee_name} ({c.employee_gac_id}) - {c.contract_type}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-700 font-medium">{days} days remaining</span>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedContract(c); setShowRenewModal(true); }}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Renew
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{contracts.length}</p>
            <p className="text-xs text-muted-foreground">Total Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{contracts.filter(c => c.status === 'Active').length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{expiringContracts.length}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{activeButExpired.length}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Employee Contracts
              </CardTitle>
              <CardDescription>Track and manage all employee contracts, tenure, and renewals</CardDescription>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Contract
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or GAC ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Renewed">Renewed</SelectItem>
                <SelectItem value="Terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-2">Loading contracts...</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No contracts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContracts.map(contract => {
                const daysRemaining = getDaysRemaining(contract.contract_end_date);
                const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;
                const isExpired = daysRemaining !== null && daysRemaining < 0;

                return (
                  <div
                    key={contract.id}
                    className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      isExpired ? 'border-destructive/50 bg-destructive/5' :
                      isExpiringSoon ? 'border-yellow-400/50 bg-yellow-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {contract.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{contract.employee_name}</h3>
                            {contract.employee_gac_id && (
                              <span className="text-xs font-mono text-primary">{contract.employee_gac_id}</span>
                            )}
                            <Badge variant={getStatusColor(contract.status)}>{contract.status}</Badge>
                            <Badge variant="outline">{contract.contract_type}</Badge>
                            {contract.renewal_count > 0 && (
                              <Badge variant="secondary">Renewal #{contract.renewal_count}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              <span>{contract.position} • {contract.department}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(contract.contract_start_date), 'dd MMM yyyy')} → {contract.contract_end_date ? format(new Date(contract.contract_end_date), 'dd MMM yyyy') : 'Permanent'}</span>
                            </div>
                            {contract.contract_duration_months && (
                              <span className="text-xs">({contract.contract_duration_months} months)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Tenure: <strong>{getTimeWithUs(contract.contract_start_date)}</strong>
                            </span>
                            {daysRemaining !== null && contract.status === 'Active' && (
                              <span className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                                {isExpired ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days remaining`}
                              </span>
                            )}
                            <span>UGX {Number(contract.salary).toLocaleString()}/month</span>
                          </div>
                          {contract.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{contract.notes}</p>
                          )}
                        </div>
                      </div>
                      {contract.status === 'Active' && contract.contract_end_date && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedContract(contract); setShowRenewModal(true); }}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Renew
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contract Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Employee Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={formData.employee_id} onValueChange={v => setFormData(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_id ? `${emp.employee_id} - ` : ''}{emp.name} ({emp.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contract Type</Label>
              <Select value={formData.contract_type} onValueChange={v => setFormData(p => ({ ...p, contract_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed-Term">Fixed-Term</SelectItem>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Probation">Probation</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.contract_start_date} onChange={e => setFormData(p => ({ ...p, contract_start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={formData.contract_end_date} onChange={e => setFormData(p => ({ ...p, contract_end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Duration (Months)</Label>
              <Input type="number" value={formData.contract_duration_months} onChange={e => setFormData(p => ({ ...p, contract_duration_months: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Contract notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddContract} disabled={!formData.employee_id || !formData.contract_start_date}>
              Add Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Contract Modal */}
      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Contract - {selectedContract?.employee_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Current:</strong> {selectedContract?.contract_type}</p>
              <p><strong>Period:</strong> {selectedContract?.contract_start_date && format(new Date(selectedContract.contract_start_date), 'dd MMM yyyy')} → {selectedContract?.contract_end_date && format(new Date(selectedContract.contract_end_date), 'dd MMM yyyy')}</p>
              <p><strong>Renewal #:</strong> {(selectedContract?.renewal_count || 0) + 1}</p>
            </div>
            <div>
              <Label>New End Date</Label>
              <Input type="date" value={renewData.new_end_date} onChange={e => setRenewData(p => ({ ...p, new_end_date: e.target.value }))} />
            </div>
            <div>
              <Label>Duration (Months)</Label>
              <Input type="number" value={renewData.duration_months} onChange={e => setRenewData(p => ({ ...p, duration_months: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewModal(false)}>Cancel</Button>
            <Button onClick={handleRenew} disabled={!renewData.new_end_date}>
              <RefreshCw className="h-4 w-4 mr-2" /> Renew Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeContractsManager;
