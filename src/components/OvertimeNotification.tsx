import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Gift } from 'lucide-react';
import { useOvertimeAwards } from '@/hooks/useOvertimeAwards';
import { OvertimeClaimModal } from './OvertimeClaimModal';

export const OvertimeNotification = () => {
  const { myAwards } = useOvertimeAwards();
  const [pendingAward, setPendingAward] = useState<any>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [awardToClaim, setAwardToClaim] = useState<any>(null);

  useEffect(() => {
    // Only show awards that are pending and not claimed/completed
    const pendingAwards = myAwards.filter(award => 
      award.status === 'pending' && 
      !award.claimed_at && 
      !award.completed_at
    );

    if (pendingAwards.length > 0 && !pendingAward && !showClaimModal) {
      setPendingAward(pendingAwards[0]);
    }
  }, [myAwards, pendingAward, showClaimModal]);

  const handleClaim = () => {
    if (pendingAward) {
      setAwardToClaim(pendingAward);
      setShowClaimModal(true);
      setPendingAward(null);
    }
  };

  const handleClose = () => {
    setPendingAward(null);
  };

  if (!pendingAward) {
    return (
      <>
        <OvertimeClaimModal 
          open={showClaimModal} 
          onOpenChange={setShowClaimModal}
          award={awardToClaim}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={!!pendingAward} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Overtime Award Available
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-lg">
                Dear <span className="font-semibold">{pendingAward.employee_name}</span>
              </p>
              <p className="text-sm text-muted-foreground">{pendingAward.department}</p>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-2">
                  <Clock className="h-5 w-5" />
                  <span className="text-lg font-semibold">
                    {pendingAward.hours > 0 && `${pendingAward.hours}h`}
                    {pendingAward.hours > 0 && pendingAward.minutes > 0 && ' '}
                    {pendingAward.minutes > 0 && `${pendingAward.minutes}m`}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <span className="text-3xl font-bold text-green-600">
                    {pendingAward.total_amount.toLocaleString()}
                  </span>
                  <span className="text-lg text-muted-foreground">UGX</span>
                </div>
              </div>

              {pendingAward.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{pendingAward.notes}</p>
                </div>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Click below to claim your overtime payment
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Later
            </Button>
            <Button 
              onClick={handleClaim}
              className="flex-1"
            >
              Claim Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OvertimeClaimModal 
        open={showClaimModal} 
        onOpenChange={setShowClaimModal}
        award={awardToClaim}
      />
    </>
  );
};
