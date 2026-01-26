import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CreditCard, TrendingDown } from 'lucide-react';
import { SalaryAdvance } from '@/hooks/useSalaryAdvances';

interface SalaryAdvanceDeductionProps {
  advance: SalaryAdvance;
  deductionAmount: string;
  onDeductionChange: (amount: string) => void;
  salaryAmount: number;
}

const SalaryAdvanceDeduction: React.FC<SalaryAdvanceDeductionProps> = ({
  advance,
  deductionAmount,
  onDeductionChange,
  salaryAmount
}) => {
  const deduction = parseFloat(deductionAmount) || 0;
  const netSalary = salaryAmount - deduction;
  const isValidDeduction = deduction >= advance.minimum_payment && deduction <= Math.min(advance.remaining_balance, salaryAmount);
  const newBalance = advance.remaining_balance - deduction;

  return (
    <div className="space-y-4">
      <Alert className="border-orange-300 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-sm text-orange-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="font-semibold">Outstanding Salary Advance</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-700">
                Active
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div>
                <span className="text-muted-foreground">Original Amount:</span>
                <p className="font-medium">{advance.original_amount.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining Balance:</span>
                <p className="font-bold text-orange-700">{advance.remaining_balance.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Minimum Payment:</span>
                <p className="font-medium">{advance.minimum_payment.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Advance Date:</span>
                <p className="font-medium">{new Date(advance.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="advance-deduction" className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-orange-600" />
          How much would you like to pay towards your advance?
        </Label>
        <Input
          id="advance-deduction"
          type="number"
          placeholder={`Minimum ${advance.minimum_payment.toLocaleString()} UGX`}
          value={deductionAmount}
          onChange={(e) => onDeductionChange(e.target.value)}
          min={advance.minimum_payment}
          max={Math.min(advance.remaining_balance, salaryAmount)}
          className={!isValidDeduction && deductionAmount ? 'border-red-500' : ''}
        />
        
        {!isValidDeduction && deductionAmount && (
          <p className="text-xs text-red-600">
            {deduction < advance.minimum_payment 
              ? `Minimum payment is ${advance.minimum_payment.toLocaleString()} UGX`
              : deduction > salaryAmount
                ? `Cannot exceed your salary amount (${salaryAmount.toLocaleString()} UGX)`
                : `Cannot exceed remaining balance (${advance.remaining_balance.toLocaleString()} UGX)`
            }
          </p>
        )}
      </div>

      {isValidDeduction && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-xs text-green-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Salary Amount:</span>
                <p className="font-medium">{salaryAmount.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Advance Deduction:</span>
                <p className="font-medium text-orange-600">- {deduction.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">Net Salary (You'll Receive):</span>
                <p className="font-bold text-green-700">{netSalary.toLocaleString()} UGX</p>
              </div>
              <div>
                <span className="text-muted-foreground">New Advance Balance:</span>
                <p className="font-bold text-blue-700">
                  {newBalance.toLocaleString()} UGX
                  {newBalance === 0 && <span className="ml-1 text-green-600">(Paid Off! 🎉)</span>}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SalaryAdvanceDeduction;
