import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, Unlock, X, Edit3 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

type Account = {
  id: string;
  employee_email: string;
  employee_name: string | null;
  approved_limit: number;
  outstanding_balance: number;
  total_drawn: number;
  total_recovered: number;
  total_interest: number;
  status: string;
  frozen: boolean;
  first_negative_at: string | null;
  last_used_at: string | null;
  auto_managed: boolean;
  approved_at: string | null;
};

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function OverdraftAdmin() {
  const { user } = useAuth();
  const adminEmail = user?.email || "admin";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("overdraft_accounts")
        .select("*")
        .order("status", { ascending: true })
        .order("outstanding_balance", { ascending: false });
      if (error) throw error;
      setAccounts((data as Account[]) || []);
    } catch (e: any) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("overdraft-recompute-limits", { body: { trigger: "manual" } });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Limits recomputed", description: `${(data as any).written} employees · ${(data as any).accounts_synced?.updated || 0} accounts updated.` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setRecomputing(false);
    }
  };

  const accrueNow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("overdraft-daily-maintenance", { body: { trigger: "manual" } });
      if (error || !(data as any)?.ok) throw new Error((data as any)?.error || error?.message);
      toast({ title: "Maintenance run", description: `Interest on ${(data as any).result?.interest_rows || 0} accounts · ${(data as any).result?.new_frozen || 0} newly frozen.` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const saveLimit = async (id: string) => {
    const val = Number(editLimit);
    if (!Number.isFinite(val) || val < 0) return toast({ title: "Invalid limit", variant: "destructive" });
    const { error } = await (supabase as any).rpc("admin_overdraft_set_limit", { p_account_id: id, p_limit: val, p_admin_email: adminEmail });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Limit updated" });
    setEditId(null); setEditLimit(""); load();
  };

  const unfreeze = async (id: string) => {
    const { error } = await (supabase as any).rpc("admin_overdraft_unfreeze", { p_account_id: id, p_admin_email: adminEmail });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Unfrozen" }); load();
  };

  const close = async (id: string) => {
    const { error } = await (supabase as any).rpc("admin_overdraft_close", { p_account_id: id, p_admin_email: adminEmail });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Closed" }); load();
  };

  const active = accounts.filter((a) => a.status === "active");
  const closed = accounts.filter((a) => a.status !== "active");

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Overdraft Admin</h1>
            <p className="text-sm text-muted-foreground">Opt-in overdraft accounts · 0.5%/day interest · 30-day freeze</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={accrueNow}><RefreshCw className="h-4 w-4 mr-1" /> Run maintenance now</Button>
            <Button size="sm" onClick={recompute} disabled={recomputing}>
              {recomputing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Recompute monthly limits
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Active accounts ({active.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active overdraft accounts.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Member</th>
                      <th>Limit</th>
                      <th>Outstanding</th>
                      <th>Interest</th>
                      <th>Days neg.</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((a) => {
                      const days = a.first_negative_at ? Math.floor((Date.now() - new Date(a.first_negative_at).getTime()) / 86400000) : 0;
                      return (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="py-2">
                            <div className="font-medium">{a.employee_name || a.employee_email}</div>
                            <div className="text-xs text-muted-foreground">{a.employee_email}</div>
                          </td>
                          <td>
                            {editId === a.id ? (
                              <div className="flex items-center gap-1">
                                <Input className="w-28 h-8" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} />
                                <Button size="sm" className="h-8" onClick={() => saveLimit(a.id)}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{fmt(a.approved_limit)}</span>
                                <button onClick={() => { setEditId(a.id); setEditLimit(String(a.approved_limit)); }} className="text-muted-foreground hover:text-foreground"><Edit3 className="h-3 w-3" /></button>
                                {!a.auto_managed && <Badge variant="outline" className="text-xs">manual</Badge>}
                              </div>
                            )}
                          </td>
                          <td className={Number(a.outstanding_balance) > 0 ? "text-destructive font-semibold" : ""}>{fmt(a.outstanding_balance)}</td>
                          <td>{fmt(a.total_interest)}</td>
                          <td>{days > 0 ? `${days}d` : "—"}</td>
                          <td>
                            {a.frozen ? <Badge variant="destructive">Frozen</Badge> : <Badge variant="secondary">Active</Badge>}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {a.frozen && (
                                <Button size="sm" variant="outline" onClick={() => unfreeze(a.id)}><Unlock className="h-3 w-3 mr-1" />Unfreeze</Button>
                              )}
                              <Button size="sm" variant="ghost" disabled={Number(a.outstanding_balance) > 0} onClick={() => close(a.id)}><X className="h-3 w-3 mr-1" />Close</Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {closed.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Closed ({closed.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                    <tr><th className="py-2">Member</th><th>Limit</th><th>Total drawn</th><th>Total recovered</th><th>Total interest</th><th>Closed</th></tr>
                  </thead>
                  <tbody>
                    {closed.map((a) => (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2">{a.employee_name || a.employee_email}</td>
                        <td>{fmt(a.approved_limit)}</td>
                        <td>{fmt(a.total_drawn)}</td>
                        <td>{fmt(a.total_recovered)}</td>
                        <td>{fmt(a.total_interest)}</td>
                        <td className="text-xs text-muted-foreground">{a.approved_at ? new Date(a.approved_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}