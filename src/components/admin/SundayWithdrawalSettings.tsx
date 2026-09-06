import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSundayWithdrawals, isSundayInKampala } from "@/hooks/useSundayWithdrawals";

export default function SundayWithdrawalSettings() {
  const { toast } = useToast();
  const { enabled, loading, setEnabled } = useSundayWithdrawals();

  const onToggle = async (next: boolean) => {
    try {
      await setEnabled.mutateAsync(next);
      toast({
        title: next ? "Sunday withdrawals enabled" : "Sunday withdrawals disabled",
        description: next
          ? "Employees can now withdraw on Sundays."
          : "Withdrawals are blocked on Sundays. Mon–Sat is unaffected.",
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Try again", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-600" />
          Sunday Withdrawals
        </CardTitle>
        <CardDescription>
          Turn withdrawals on or off for Sundays only. Monday to Saturday is never affected by this switch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Label htmlFor="sunday-withdrawals" className="text-sm font-medium">
                Allow withdrawals on Sundays
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {enabled
                  ? "Currently ON — Sunday withdrawals are allowed."
                  : "Currently OFF — anyone trying to withdraw on a Sunday will be blocked."}
                {isSundayInKampala() && (
                  <span className="block mt-1 font-medium text-amber-700">Today is Sunday, so this setting is active right now.</span>
                )}
              </p>
            </div>
            <Switch
              id="sunday-withdrawals"
              checked={enabled}
              disabled={setEnabled.isPending}
              onCheckedChange={onToggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
