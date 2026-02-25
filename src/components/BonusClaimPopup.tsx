import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const BonusClaimPopup = () => {
  const [pendingBonuses, setPendingBonuses] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

    // Small delay to not block login flow
    const timer = setTimeout(checkBonuses, 1500);
    return () => clearTimeout(timer);
  }, [user?.email]);

  const claimBonus = async () => {
    const bonus = pendingBonuses[currentIndex];
    if (!bonus || !user) return;

    setClaiming(true);
    try {
      // 1. Mark bonus as claimed
      const { error: updateError } = await supabase
        .from("bonuses")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", bonus.id);

      if (updateError) throw updateError;

      // 2. Add to ledger as BONUS entry
      const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert({
          user_id: user.id,
          entry_type: "BONUS",
          amount: bonus.amount,
          reference: `BONUS-${bonus.id}`,
          metadata: {
            bonus_id: bonus.id,
            reason: bonus.reason,
            allocated_by: bonus.allocated_by,
          },
        });

      if (ledgerError) throw ledgerError;

      toast({
        title: "🎉 Bonus Claimed!",
        description: `UGX ${Number(bonus.amount).toLocaleString()} has been added to your balance.`,
        duration: 5000,
      });

      // Move to next bonus or close
      if (currentIndex < pendingBonuses.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setPendingBonuses([]);
        setCurrentIndex(0);
      }

      queryClient.invalidateQueries({ queryKey: ["bonus-balance"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-stats"] });
    } catch (err: any) {
      toast({ title: "Error claiming bonus", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const currentBonus = pendingBonuses[currentIndex];
  if (!currentBonus) return null;

  return (
    <Dialog open={!!currentBonus} onOpenChange={() => setPendingBonuses([])}>
      <DialogContent className="sm:max-w-md">
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
              <p className="font-semibold text-lg">{currentBonus.reason}</p>
            </div>
            <div className="text-4xl font-bold text-amber-700">
              UGX {Number(currentBonus.amount).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Allocated by {currentBonus.allocated_by}
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
      </DialogContent>
    </Dialog>
  );
};

export default BonusClaimPopup;
