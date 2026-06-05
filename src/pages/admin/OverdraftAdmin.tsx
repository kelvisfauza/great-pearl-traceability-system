import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type App = {
  id: string;
  employee_email: string;
  employee_name: string | null;
  requested_amount: number;
  calculated_limit: number;
  approved_limit: number | null;
  status: string;
  reason: string | null;
  factors: any;
  created_at: string;
};

type Account = {
  id: string;
  employee_email: string;
  employee_name: string | null;
  approved_limit: number;
  outstanding_balance: number;
  total_drawn: number;
  status: string;
  approved_at: string | null;
};

const fmt = (n: number) => `UGX ${Number(n || 0).toLocaleString()}`;

export default function OverdraftAdmin() {
  const { user } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      (supabase as any).from("overdraft_applications").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("overdraft_accounts").select("*").order("created_at", { ascending: false }),
    ]);
    setApps((a.data as App[]) || []);
    setAccounts((b.data as Account[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (app: App, action: "approve" | "reject") => {
    setWorking(app.id);
    try {
      const { data, error } = await supabase.functions.invoke("overdraft-approve", {
        body: {
          application_id: app.id,
          action,
          approved_limit: action === "approve"
            ? Number(limits[app.id] || app.calculated_limit)
            : undefined,
          rejection_reason: action === "reject" ? (reasons[app.id] || "Not approved") : undefined,
          approver_email: user?.email || "Admin",
        },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed");
      toast({ title: action === "approve" ? "Overdraft approved" : "Application rejected" });
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setWorking(null);
    }
  };

  const pending = apps.filter(a => a.status === "pending");
  const history = apps.filter(a => a.status !== "pending");

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Overdraft Administration</h1>
          <p className="text-sm text-muted-foreground">Review and approve employee overdraft applications.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Applications <Badge variant="secondary">{pending.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {!loading && pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending applications.</p>
          )}
          {pending.map(app => (
            <div key={app.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold">{app.employee_name || app.employee_email}</div>
                  <div className="text-xs text-muted-foreground">{app.employee_email}</div>
                  <div className="text-xs text-muted-foreground">Applied {new Date(app.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right text-sm">
                  <div>Requested: <strong>{fmt(app.requested_amount)}</strong></div>
                  <div>AI limit: <strong>{fmt(app.calculated_limit)}</strong></div>
                </div>
              </div>
              {app.reason && <div className="text-sm"><span className="text-muted-foreground">Reason:</span> {app.reason}</div>}
              {app.factors && (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                  90d inflow: {fmt(app.factors.last_90d_inflow || 0)} · monthly avg: {fmt(app.factors.monthly_average || 0)}
                  {app.factors.salary ? ` · salary: ${fmt(app.factors.salary)}` : ""}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Approved limit (UGX)</label>
                  <Input
                    type="number"
                    placeholder={String(app.calculated_limit)}
                    value={limits[app.id] ?? String(app.calculated_limit)}
                    onChange={e => setLimits(s => ({ ...s, [app.id]: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Rejection reason (if rejecting)</label>
                  <Textarea
                    rows={2}
                    placeholder="Optional"
                    value={reasons[app.id] ?? ""}
                    onChange={e => setReasons(s => ({ ...s, [app.id]: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="destructive" size="sm" disabled={working === app.id} onClick={() => decide(app, "reject")}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button size="sm" disabled={working === app.id} onClick={() => decide(app, "approve")}>
                  {working === app.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Approve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Overdraft Accounts <Badge variant="secondary">{accounts.length}</Badge></CardTitle></CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active accounts.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(a => (
                <div key={a.id} className="flex flex-wrap justify-between gap-2 border rounded p-3 text-sm">
                  <div>
                    <div className="font-medium">{a.employee_name || a.employee_email}</div>
                    <div className="text-xs text-muted-foreground">{a.employee_email}</div>
                  </div>
                  <div className="text-right">
                    <div>Limit: <strong>{fmt(a.approved_limit)}</strong></div>
                    <div>Outstanding: <strong className={Number(a.outstanding_balance) > 0 ? "text-orange-600" : ""}>{fmt(a.outstanding_balance)}</strong></div>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>{a.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History <Badge variant="secondary">{history.length}</Badge></CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history.</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex flex-wrap justify-between gap-2 border rounded p-3 text-sm">
                  <div>
                    <div className="font-medium">{h.employee_name || h.employee_email}</div>
                    <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div>Requested: {fmt(h.requested_amount)}</div>
                    <div>{h.approved_limit ? `Approved: ${fmt(h.approved_limit)}` : ""}</div>
                    <Badge variant={h.status === "approved" ? "default" : "destructive"}>{h.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}