import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck } from "lucide-react";

interface LoanPolicy {
  business_max: number;
  business_floor: number;
  high_value_threshold: number;
  high_value_coverage: number;
}

const DEFAULTS: LoanPolicy = {
  business_max: 15_000_000,
  business_floor: 2_000_000,
  high_value_threshold: 5_000_000,
  high_value_coverage: 1,
};

const LoanPolicySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<LoanPolicy>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ["loan-product-limits"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("system_settings" as any)
        .select("setting_value")
        .eq("setting_key", "loan_product_limits")
        .maybeSingle() as any);
      if (error) throw error;
      return { ...DEFAULTS, ...((data?.setting_value as any) || {}) } as LoanPolicy;
    },
  });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("system_settings" as any) as any).upsert(
        {
          setting_key: "loan_product_limits",
          setting_value: form as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-product-limits"] });
      toast({ title: "Loan policy saved", description: "New limits apply to the next evaluation." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const num = (k: keyof LoanPolicy) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: Number(e.target.value || 0) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Employee Business Loan Policy
        </CardTitle>
        <CardDescription>
          Set the maximum facility the system may award. The system never awards the maximum automatically —
          the evaluation engine decides the final amount from guarantor capacity, repayment history and risk,
          and the security/recovery rules below still apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Maximum business loan (UGX)</Label>
                <Input type="number" value={form.business_max} onChange={num("business_max")} />
                <p className="text-xs text-muted-foreground">Absolute ceiling. Evaluation may award less.</p>
              </div>
              <div className="space-y-2">
                <Label>Base entitlement floor (UGX)</Label>
                <Input type="number" value={form.business_floor} onChange={num("business_floor")} />
                <p className="text-xs text-muted-foreground">Only granted when both guarantors are fully clean.</p>
              </div>
              <div className="space-y-2">
                <Label>High-value threshold (UGX)</Label>
                <Input type="number" value={form.high_value_threshold} onChange={num("high_value_threshold")} />
                <p className="text-xs text-muted-foreground">Above this, stricter security rules kick in.</p>
              </div>
              <div className="space-y-2">
                <Label>Required guarantor cover (×)</Label>
                <Input type="number" step="0.1" value={form.high_value_coverage} onChange={num("high_value_coverage")} />
                <p className="text-xs text-muted-foreground">Combined guarantor capacity must cover the facility this many times.</p>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-medium">Security &amp; recovery policy enforced by the evaluation</p>
              <p>• Any guarantor with a default, overdue loan, defaulted guarantee, prior recovery hit or no salary → capacity 0 and the facility is denied.</p>
              <p>• Above the high-value threshold, guarantors must be fully clean and provide the required cover, otherwise the offer is trimmed back to the threshold.</p>
              <p>• Recovery order on arrears: borrower wallet → guarantor 1 wallet → guarantor 2 wallet, with overdraft creation where needed.</p>
              <p>• Signed terms &amp; conditions with wallet-deduction authority are required before disbursement.</p>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save policy
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LoanPolicySettings;
