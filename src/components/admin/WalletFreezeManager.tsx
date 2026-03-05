import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Snowflake, Search, ShieldOff } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  wallet_frozen: boolean;
  wallet_frozen_at: string | null;
  wallet_frozen_by: string | null;
  wallet_frozen_reason: string | null;
}

const WalletFreezeManager = () => {
  const { employee: currentEmployee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [freezeTarget, setFreezeTarget] = useState<Employee | null>(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [unfreezeTarget, setUnfreezeTarget] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-wallet-freeze"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, email, department, wallet_frozen, wallet_frozen_at, wallet_frozen_by, wallet_frozen_reason")
        .eq("status", "Active")
        .order("name");
      if (error) throw error;
      return (data || []) as Employee[];
    },
  });

  const freezeMutation = useMutation({
    mutationFn: async ({ employeeId, reason }: { employeeId: string; reason: string }) => {
      // Enforce max 2 frozen accounts
      if (frozenAccounts.length >= 2) {
        throw new Error("Maximum of 2 wallets can be frozen at a time. Unfreeze one first.");
      }
      const { error } = await supabase
        .from("employees")
        .update({
          wallet_frozen: true,
          wallet_frozen_at: new Date().toISOString(),
          wallet_frozen_by: currentEmployee?.name || "Admin",
          wallet_frozen_reason: reason,
        })
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-wallet-freeze"] });
      toast({ title: "Wallet Frozen", description: `${freezeTarget?.name}'s wallet has been frozen.` });
      setFreezeTarget(null);
      setFreezeReason("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to freeze wallet", variant: "destructive" });
    },
  });

  const unfreezeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from("employees")
        .update({
          wallet_frozen: false,
          wallet_frozen_at: null,
          wallet_frozen_by: null,
          wallet_frozen_reason: null,
        })
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-wallet-freeze"] });
      toast({ title: "Wallet Unfrozen", description: `${unfreezeTarget?.name}'s wallet has been unfrozen.` });
      setUnfreezeTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unfreeze wallet", variant: "destructive" });
    },
  });

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  );

  const frozenAccounts = employees.filter((e) => e.wallet_frozen);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-500" />
            Wallet Freeze Management
          </CardTitle>
          <CardDescription>
            Freeze individual user wallets to prevent withdrawals. Deposits, awards, and recoveries still apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {frozenAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-destructive">Currently Frozen ({frozenAccounts.length})</h4>
              <div className="space-y-2">
                {frozenAccounts.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.wallet_frozen_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Frozen by {emp.wallet_frozen_by} • {emp.wallet_frozen_at ? format(new Date(emp.wallet_frozen_at), "dd MMM yyyy HH:mm") : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setUnfreezeTarget(emp)}>
                      <ShieldOff className="h-4 w-4 mr-1" /> Unfreeze
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {frozenAccounts.length >= 2 ? (
            <p className="text-sm text-muted-foreground">Maximum of 2 frozen wallets reached. Unfreeze one to freeze another.</p>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee to freeze..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {search && (
                <div className="max-h-60 overflow-auto space-y-1 border rounded-lg p-2">
                  {filtered.filter((e) => !e.wallet_frozen).map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.department} • {emp.email}</p>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => setFreezeTarget(emp)}>
                        <Snowflake className="h-4 w-4 mr-1" /> Freeze
                      </Button>
                    </div>
                  ))}
                  {filtered.filter((e) => !e.wallet_frozen).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No matching employees found</p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Freeze Dialog */}
      <Dialog open={!!freezeTarget} onOpenChange={(o) => !o && setFreezeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Freeze {freezeTarget?.name}'s Wallet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will prevent {freezeTarget?.name} from making any withdrawals. Deposits, loyalty rewards, and loan recoveries will continue normally.
          </p>
          <div className="space-y-2">
            <Label>Reason for freezing</Label>
            <Textarea
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="e.g. Pending investigation, disciplinary action..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!freezeReason.trim() || freezeMutation.isPending}
              onClick={() => freezeTarget && freezeMutation.mutate({ employeeId: freezeTarget.id, reason: freezeReason })}
            >
              {freezeMutation.isPending ? "Freezing..." : "Confirm Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfreeze Dialog */}
      <Dialog open={!!unfreezeTarget} onOpenChange={(o) => !o && setUnfreezeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unfreeze {unfreezeTarget?.name}'s Wallet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will restore {unfreezeTarget?.name}'s ability to make withdrawals.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnfreezeTarget(null)}>Cancel</Button>
            <Button
              disabled={unfreezeMutation.isPending}
              onClick={() => unfreezeTarget && unfreezeMutation.mutate(unfreezeTarget.id)}
            >
              {unfreezeMutation.isPending ? "Unfreezing..." : "Confirm Unfreeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletFreezeManager;
