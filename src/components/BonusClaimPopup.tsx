import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, PartyPopper, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useWithdrawalControl } from "@/hooks/useWithdrawalControl";

const generateBonusRef = () => {
  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BNS-${date}-${rand}`;
};

const printBonusVoucher = (bonus: any, ref: string, employeeName: string) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const now = new Date();
  const content = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Bonus Voucher – ${ref}</title>
<style>
  body { font: 14px/1.6 system-ui, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
  .voucher { max-width: 680px; margin: 0 auto; border: 2px solid #7c3aed; border-radius: 12px; padding: 32px; }
  .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; margin: 0; color: #7c3aed; }
  .header h2 { font-size: 14px; margin: 4px 0 0; color: #666; font-weight: normal; }
  .company { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .ref { background: #f3f0ff; padding: 8px 16px; border-radius: 8px; text-align: center; font-size: 16px; margin: 16px 0; }
  .ref strong { color: #7c3aed; font-size: 18px; }
  .details { margin: 20px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .row:last-child { border-bottom: none; }
  .label { color: #666; }
  .value { font-weight: 600; }
  .amount-box { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0; }
  .amount-box .big { font-size: 32px; font-weight: bold; }
  .amount-box .sub { font-size: 12px; opacity: 0.9; margin-top: 4px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
  .sig-block { text-align: center; width: 45%; }
  .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 6px; font-size: 12px; }
  .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #999; }
  @media print { body { padding: 0; } .voucher { border: 1px solid #ccc; } }
</style>
</head><body onload="window.print();">
<div class="voucher">
  <div class="header">
    <div class="company">Great Agro Coffee</div>
    <h1>🎁 BONUS PAYMENT VOUCHER</h1>
    <h2>Employee Bonus Claim Receipt</h2>
  </div>
  <div class="ref">Reference: <strong>${ref}</strong></div>
  <div class="details">
    <div class="row"><span class="label">Employee Name:</span><span class="value">${employeeName}</span></div>
    <div class="row"><span class="label">Bonus Reason:</span><span class="value">${bonus.reason}</span></div>
    <div class="row"><span class="label">Allocated By:</span><span class="value">${bonus.allocated_by}</span></div>
    <div class="row"><span class="label">Allocated Date:</span><span class="value">${new Date(bonus.allocated_at || bonus.created_at).toLocaleDateString()}</span></div>
    <div class="row"><span class="label">Claimed Date:</span><span class="value">${now.toLocaleDateString()} ${now.toLocaleTimeString()}</span></div>
    <div class="row"><span class="label">Source:</span><span class="value">Employee Bonus</span></div>
  </div>
  <div class="amount-box">
    <div class="big">UGX ${Number(bonus.amount).toLocaleString()}</div>
    <div class="sub">Bonus Amount Credited to Balance</div>
  </div>
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Employee Signature</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Finance Officer</div>
    </div>
  </div>
  <div class="footer">
    <p>This voucher confirms that the above bonus has been claimed and credited to the employee's account balance.</p>
    <p>Great Agro Coffee • Generated on ${now.toLocaleString()}</p>
  </div>
</div>
</body></html>`;
  printWindow.document.write(content);
  printWindow.document.close();
};

const BonusClaimPopup = () => {
  const [pendingBonuses, setPendingBonuses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimedRef, setClaimedRef] = useState<string | null>(null);
  const [claimedBonus, setClaimedBonus] = useState<any>(null);
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isWithdrawalDisabled } = useWithdrawalControl();
  const withdrawalStatus = isWithdrawalDisabled();

  useEffect(() => {
    if (!user?.email) return;

    const checkBonuses = async () => {
      const { data } = await supabase
        .from("bonuses")
        .select("*")
        .eq("employee_email", user.email!)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setPendingBonuses(data);
      }
    };

    const timer = setTimeout(checkBonuses, 1500);
    return () => clearTimeout(timer);
  }, [user?.email]);

  const claimBonus = async () => {
    const bonus = pendingBonuses[currentIndex];
    if (!bonus || !user) return;

    setClaiming(true);
    const ref = generateBonusRef();

    try {
      const { error: updateError } = await supabase
        .from("bonuses")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", bonus.id);

      if (updateError) throw updateError;

      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert({
          user_id: user.id,
          entry_type: "BONUS",
          amount: bonus.amount,
          reference: ref,
          metadata: {
            bonus_id: bonus.id,
            reason: bonus.reason,
            allocated_by: bonus.allocated_by,
            voucher_ref: ref,
          },
        });

      if (ledgerError) throw ledgerError;

      toast({
        title: "🎉 Bonus Claimed!",
        description: `Ref: ${ref}. UGX ${Number(bonus.amount).toLocaleString()} added to your balance.`,
        duration: 8000,
      });

      // Show voucher state
      setClaimedRef(ref);
      setClaimedBonus(bonus);

      queryClient.invalidateQueries({ queryKey: ["bonus-balance"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-stats"] });
    } catch (err: any) {
      toast({ title: "Error claiming bonus", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const handlePrintAndNext = () => {
    if (claimedBonus && claimedRef) {
      printBonusVoucher(claimedBonus, claimedRef, employee?.name || "Employee");
    }
    // Move to next or close
    setClaimedRef(null);
    setClaimedBonus(null);
    if (currentIndex < pendingBonuses.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPendingBonuses([]);
      setCurrentIndex(0);
    }
  };

  const handleSkipPrint = () => {
    setClaimedRef(null);
    setClaimedBonus(null);
    if (currentIndex < pendingBonuses.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPendingBonuses([]);
      setCurrentIndex(0);
    }
  };

  const currentBonus = pendingBonuses[currentIndex];
  const showDialog = !!currentBonus || !!claimedRef;

  if (!showDialog) return null;

  return (
    <Dialog open={showDialog} onOpenChange={() => { setPendingBonuses([]); setClaimedRef(null); setClaimedBonus(null); }}>
      <DialogContent className="sm:max-w-md">
        {claimedRef ? (
          /* Post-claim: show ref & balance credited */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <PartyPopper className="h-6 w-6 text-green-600" />
                Bonus Claimed!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center">
                  <Gift className="h-8 w-8 text-green-600" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">Reference Number</p>
                  <p className="text-xl font-bold font-mono tracking-wider">{claimedRef}</p>
                </div>
                <div className="text-3xl font-bold text-green-700">
                  UGX {Number(claimedBonus?.amount || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">{claimedBonus?.reason}</p>
                <p className="text-sm text-green-600 font-medium">
                  ✅ Added to your wallet balance. You can withdraw when withdrawals are enabled.
                </p>
              </div>

              <Button
                onClick={handleSkipPrint}
                className="w-full h-12 font-semibold"
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          /* Pre-claim: show bonus details */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <PartyPopper className="h-6 w-6 text-amber-500" />
                You Have a Bonus!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center">
                  <Gift className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus from</p>
                  <p className="font-semibold text-lg">{currentBonus?.reason}</p>
                </div>
                <div className="text-4xl font-bold text-amber-700">
                  UGX {Number(currentBonus?.amount || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Allocated by {currentBonus?.allocated_by}
                </p>
              </div>

              <Button
                onClick={claimBonus}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-semibold text-lg h-12"
              >
                {claiming ? "Claiming..." : "🎉 Claim Bonus"}
              </Button>

              {pendingBonuses.length > 1 && (
                <p className="text-xs text-center text-muted-foreground">
                  {currentIndex + 1} of {pendingBonuses.length} bonuses
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BonusClaimPopup;
