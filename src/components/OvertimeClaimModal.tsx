import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOvertimeAwards, OvertimeAward } from '@/hooks/useOvertimeAwards';
import { Copy, Check, FileText } from 'lucide-react';

interface OvertimeClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award: OvertimeAward | null;
}

export const OvertimeClaimModal = ({ open, onOpenChange, award }: OvertimeClaimModalProps) => {
  const [claiming, setClaiming] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { claimOvertime } = useOvertimeAwards();

  const handleClaim = async () => {
    if (!award) return;

    setClaiming(true);
    const refNumber = await claimOvertime(award.id);
    setClaiming(false);

    if (refNumber) {
      setReferenceNumber(refNumber);
    }
  };

  const handleCopyReference = () => {
    if (referenceNumber) {
      navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setReferenceNumber(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (!award) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claim Overtime Payment
          </DialogTitle>
        </DialogHeader>

        {!referenceNumber ? (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Employee:</span>
                <span className="font-semibold">{award.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Department:</span>
                <span className="font-semibold">{award.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Overtime:</span>
                <span className="font-semibold">
                  {award.hours}h {award.minutes}m
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  {award.total_amount.toLocaleString()} UGX
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              By claiming, you will receive a reference number that can be used to track your claim with the admin.
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleClaim} disabled={claiming} className="flex-1">
                {claiming ? 'Processing...' : 'Submit Claim'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Claim Submitted Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your overtime claim has been submitted. Please save the reference number below.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reference Number</Label>
              <div className="flex gap-2">
                <Input
                  value={referenceNumber}
                  readOnly
                  className="font-mono text-center font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReference}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this reference number to check the status of your claim with the admin.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
