import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, differenceInMonths, addMonths } from 'date-fns';

interface ContractTenureCardProps {
  employee: any;
}

interface ContractInfo {
  id: string;
  contract_start_date: string;
  contract_end_date: string | null;
  contract_type: string;
  status: string;
  renewal_count: number;
  contract_duration_months: number | null;
}

const ContractTenureCard = ({ employee }: ContractTenureCardProps) => {
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee?.email) return;
    fetchContract();
  }, [employee?.email]);

  const fetchContract = async () => {
    try {
      // Get the latest active/current contract
      const { data, error } = await supabase
        .from('employee_contracts')
        .select('id, contract_start_date, contract_end_date, contract_type, status, renewal_count, contract_duration_months')
        .eq('employee_email', employee.email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setContract(data[0] as ContractInfo);
      } else {
        // No contract exists — compute from join_date (default 6 months)
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
          });
        }
      }
    } catch (err) {
      console.error('Error fetching contract:', err);
    } finally {
      setLoading(false);
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

  if (!contract) return null;

  const startDate = new Date(contract.contract_start_date);
  const endDate = contract.contract_end_date ? new Date(contract.contract_end_date) : null;
  const now = new Date();

  // Tenure calculation
  const tenureMonths = differenceInMonths(now, startDate);
  const tenureYears = Math.floor(tenureMonths / 12);
  const tenureRemainingMonths = tenureMonths % 12;
  const tenureLabel = tenureYears > 0
    ? `${tenureYears} year${tenureYears > 1 ? 's' : ''}, ${tenureRemainingMonths} month${tenureRemainingMonths !== 1 ? 's' : ''}`
    : `${tenureMonths} month${tenureMonths !== 1 ? 's' : ''}`;

  // Contract progress & status
  let daysRemaining = 0;
  let totalDays = 1;
  let progressPercent = 100;
  let statusColor: 'default' | 'destructive' | 'secondary' | 'outline' = 'default';
  let statusIcon = <CheckCircle className="h-4 w-4" />;
  let statusLabel = contract.status;

  if (endDate) {
    totalDays = Math.max(1, differenceInDays(endDate, startDate));
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Contract & Tenure
        </CardTitle>
        <CardDescription>Your employment contract details and tenure information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status & Tenure Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusColor} className="flex items-center gap-1.5 text-sm px-3 py-1">
            {statusIcon}
            {statusLabel}
          </Badge>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
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
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
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
      </CardContent>
    </Card>
  );
};

export default ContractTenureCard;
