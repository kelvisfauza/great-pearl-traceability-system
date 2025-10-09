import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOvertimeAwards, OvertimeAward } from '@/hooks/useOvertimeAwards';
import { Clock, DollarSign, Gift } from 'lucide-react';
import { OvertimeClaimModal } from './OvertimeClaimModal';

export const OvertimeNotification = () => {
  const [pendingAward, setPendingAward] = useState<OvertimeAward | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [awardToClaim, setAwardToClaim] = useState<OvertimeAward | null>(null);
  const { myAwards } = useOvertimeAwards();

  useEffect(() => {
    console.log('OvertimeNotification - myAwards updated:', myAwards);
    // ONLY show awards that are status === 'pending'
    // Claimed or completed awards should NEVER show
    const newPendingAwards = myAwards.filter(award => 
      award.status === 'pending' && 
      !award.claimed_at && 
      !award.completed_at
    );
    console.log('Truly pending awards (not claimed/completed):', newPendingAwards);
    
    if (newPendingAwards.length > 0 && !showClaimModal) {
      // Show the most recent one, but not if claim modal is open
      console.log('Setting pending award:', newPendingAwards[0]);
      setPendingAward(newPendingAwards[0]);
    } else {
      // Clear pending award if there are none or modal is open
      if (!showClaimModal) {
        setPendingAward(null);
      }
    }
  }, [myAwards, showClaimModal]);

  const handleClose = () => {
    setPendingAward(null);
  };

  const handleClaim = () => {
    console.log('🔔 Claim Now clicked!');
    console.log('🔔 Pending award:', pendingAward);
    if (pendingAward) {
      console.log('🔔 Setting award to claim:', pendingAward);
      setAwardToClaim(pendingAward);
      console.log('🔔 Opening claim modal...');
      setShowClaimModal(true);
      // Immediately close notification
      setPendingAward(null);
    } else {
      console.error('❌ No pending award found!');
    }
  };

  if (!pendingAward) return null;

  return (
    <>
      <Dialog open={!!pendingAward} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Gift className="h-6 w-6" />
              Overtime Award Notification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <p className="text-lg">
                Dear <span className="font-semibold">{pendingAward.employee_name}</span>,
              </p>
              <p className="text-muted-foreground">
                {pendingAward.department} Department
              </p>
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-semibold">
                  {pendingAward.hours > 0 && `${pendingAward.hours} hour${pendingAward.hours !== 1 ? 's' : ''}`}
                  {pendingAward.hours > 0 && pendingAward.minutes > 0 && ' and '}
                  {pendingAward.minutes > 0 && `${pendingAward.minutes} minute${pendingAward.minutes !== 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Calculated Amount</p>
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
                  <p className="text-xs text-muted-foreground mb-1">Note:</p>
                  <p className="text-sm">{pendingAward.notes}</p>
                </div>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              You can claim this overtime payment now
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }} 
              className="flex-1"
            >
              Later
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleClaim();
              }} 
              className="flex-1"
              type="button"
            >
              Claim Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OvertimeClaimModal
        open={showClaimModal}
        onOpenChange={(open) => {
          setShowClaimModal(open);
          if (!open) setAwardToClaim(null); // Clear when modal closes
        }}
        award={awardToClaim}
      />
    </>
  );
};
