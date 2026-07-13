import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Filter, Download, RefreshCw, Activity } from "lucide-react";
import { format, eachDayOfInterval, parseISO } from "date-fns";

type EventType = "LOGIN" | "SESSION" | "LOCATION" | "ACTION" | "LOGOUT" | "ACTIVITY";

interface Row {
  id: string;
  occurred_at: string;
  employee_name: string;
  employee_email: string;
  event: EventType;
  action: string;
  details: string;
  location: string;
  ip: string;
  device: string;
}

const eventColor = (e: EventType) => {
  switch (e) {
    case "LOGIN": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "LOGOUT": return "bg-slate-100 text-slate-700 border-slate-200";
    case "SESSION": return "bg-blue-100 text-blue-800 border-blue-200";
    case "LOCATION": return "bg-amber-100 text-amber-800 border-amber-200";
    case "ACTION": return "bg-purple-100 text-purple-800 border-purple-200";
    case "ACTIVITY": return "bg-indigo-100 text-indigo-800 border-indigo-200";
  }
};

export default function UserActivityReport() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(format(firstOfMonth, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [employee, setEmployee] = useState<string>("all");
  const [event, setEvent] = useState<string>("all");
  const [search, setSearch] = useState("");

  const startISO = new Date(startDate + "T00:00:00").toISOString();
  const endISO = new Date(endDate + "T23:59:59").toISOString();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["user-activity-report", startDate, endDate],
    queryFn: async () => {
      const [logins, sessions, locations, audits, activities, employeesRes] = await Promise.all([
        supabase
          .from("employee_login_tracker")
          .select("id, employee_name, employee_email, login_time")
          .gte("login_time", startISO).lte("login_time", endISO)
          .order("login_time", { ascending: false }).limit(5000),
        supabase
          .from("user_session_logs")
          .select("id, employee_name, employee_email, ip_address, city, country, browser, os, device_type, device_model, latitude, longitude, location_address, login_at, logout_at, session_duration_minutes")
          .gte("login_at", startISO).lte("login_at", endISO)
          .order("login_at", { ascending: false }).limit(5000),
        supabase
          .from("location_tracking_logs")
          .select("id, employee_name, employee_email, latitude, longitude, location_address, ip_address, device_model, recorded_at")
          .gte("recorded_at", startISO).lte("recorded_at", endISO)
          .order("recorded_at", { ascending: false }).limit(5000),
        (supabase as any)
          .from("audit_logs")
          .select("id, action, table_name, record_id, performed_by, department, reason, created_at, record_data")
          .gte("created_at", startISO).lte("created_at", endISO)
          .order("created_at", { ascending: false }).limit(5000),
        (supabase as any)
          .from("user_activity")
          .select("id, user_id, activity_type, metadata, created_at")
          .gte("created_at", startISO).lte("created_at", endISO)
          .order("created_at", { ascending: false }).limit(10000),
        (supabase as any)
          .from("employees")
          .select("auth_user_id, name, email")
          .not("auth_user_id", "is", null),
      ]);

      const empByAuth = new Map<string, { name: string; email: string }>();
      (employeesRes.data || []).forEach((e: any) => {
        if (e.auth_user_id) empByAuth.set(e.auth_user_id, { name: e.name || "—", email: e.email || "" });
      });

      const rows: Row[] = [];

      (logins.data || []).forEach((l: any) => rows.push({
        id: `login-${l.id}`,
        occurred_at: l.login_time,
        employee_name: l.employee_name || "—",
        employee_email: l.employee_email || "",
        event: "LOGIN",
        action: "Signed in",
        details: "Successful authentication",
        location: "",
        ip: "",
        device: "",
      }));

      (sessions.data || []).forEach((s: any) => {
        const loc = s.location_address || [s.city, s.country].filter(Boolean).join(", ") || (s.latitude ? `${s.latitude}, ${s.longitude}` : "");
        const device = [s.device_model, s.device_type, s.os, s.browser].filter(Boolean).join(" • ");
        rows.push({
          id: `session-${s.id}`,
          occurred_at: s.login_at,
          employee_name: s.employee_name || "—",
          employee_email: s.employee_email || "",
          event: "SESSION",
          action: "Session started",
          details: s.session_duration_minutes != null ? `Duration: ${s.session_duration_minutes} min` : "Active session",
          location: loc,
          ip: s.ip_address || "",
          device,
        });
        if (s.logout_at) {
          rows.push({
            id: `logout-${s.id}`,
            occurred_at: s.logout_at,
            employee_name: s.employee_name || "—",
            employee_email: s.employee_email || "",
            event: "LOGOUT",
            action: "Signed out",
            details: s.session_duration_minutes != null ? `Session lasted ${s.session_duration_minutes} min` : "",
            location: loc,
            ip: s.ip_address || "",
            device,
          });
        }
      });

      (locations.data || []).forEach((l: any) => rows.push({
        id: `loc-${l.id}`,
        occurred_at: l.recorded_at,
        employee_name: l.employee_name || "—",
        employee_email: l.employee_email || "",
        event: "LOCATION",
        action: "Location recorded",
        details: "",
        location: l.location_address || (l.latitude ? `${l.latitude}, ${l.longitude}` : ""),
        ip: l.ip_address || "",
        device: l.device_model || "",
      }));

      (audits.data || []).forEach((a: any) => {
        const details = [a.table_name && `Table: ${a.table_name}`, a.record_id && `Record: ${a.record_id}`, a.reason].filter(Boolean).join(" • ");
        rows.push({
          id: `audit-${a.id}`,
          occurred_at: a.created_at,
          employee_name: a.performed_by || "System",
          employee_email: a.performed_by || "",
          event: "ACTION",
          action: a.action || "Action",
          details: details || (a.department ? `Dept: ${a.department}` : ""),
          location: "",
          ip: "",
          device: "",
        });
      });

      const prettyType: Record<string, string> = {
        page_visit: "Visited page",
        data_entry: "Entered data",
        form_submission: "Submitted form",
        interaction: "Clicked button",
        report_generation: "Generated report",
        task_completion: "Completed task",
        document_upload: "Uploaded document",
        transaction: "Processed transaction",
      };
      (activities.data || []).forEach((a: any) => {
        const emp = empByAuth.get(a.user_id);
        const meta = a.metadata || {};
        const page = meta.page || "";
        const formName = meta.form_name || "";
        const desc = meta.description || "";
        const action = prettyType[a.activity_type] || a.activity_type;
        const details = [
          page && `Page: ${page}`,
          formName && `Form: ${formName}`,
          desc && !formName && !page && desc,
        ].filter(Boolean).join(" • ");
        rows.push({
          id: `act-${a.id}`,
          occurred_at: a.created_at,
          employee_name: emp?.name || "—",
          employee_email: emp?.email || "",
          event: "ACTIVITY",
          action,
          details: details || desc || "",
          location: "",
          ip: "",
          device: "",
        });
      });

      rows.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
      return rows;
    },
  });

  const employees = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach((r) => r.employee_name && set.add(r.employee_name));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data || []).filter((r) => {
      if (employee !== "all" && r.employee_name !== employee) return false;
      if (event !== "all" && r.event !== event) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${r.employee_name} ${r.employee_email} ${r.action} ${r.details} ${r.location} ${r.ip} ${r.device}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [data, employee, event, search]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, logins: 0, sessions: 0, locations: 0, actions: 0, activities: 0, uniqueUsers: new Set<string>() };
    filtered.forEach((r) => {
      if (r.event === "LOGIN") s.logins++;
      else if (r.event === "SESSION") s.sessions++;
      else if (r.event === "LOCATION") s.locations++;
      else if (r.event === "ACTION") s.actions++;
      else if (r.event === "ACTIVITY") s.activities++;
      if (r.employee_name) s.uniqueUsers.add(r.employee_name);
    });
    return { ...s, uniqueUsers: s.uniqueUsers.size };
  }, [filtered]);

  // Days-missed analysis (login gaps) — computed from the current filter
  const missedDays = useMemo(() => {
    try {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
        .map((d) => format(d, "yyyy-MM-dd"));
      const byEmp = new Map<string, Set<string>>();
      (data || []).filter((r) => r.event === "LOGIN").forEach((r) => {
        const key = r.employee_name;
        if (!key || key === "—") return;
        const d = format(new Date(r.occurred_at), "yyyy-MM-dd");
        if (!byEmp.has(key)) byEmp.set(key, new Set());
        byEmp.get(key)!.add(d);
      });
      const results = Array.from(byEmp.entries()).map(([name, set]) => ({
        name,
        loggedDays: set.size,
        missed: days.filter((d) => !set.has(d)),
      })).sort((a, b) => a.loggedDays - b.loggedDays);
      return employee === "all" ? results : results.filter((r) => r.name === employee);
    } catch {
      return [];
    }
  }, [data, startDate, endDate, employee]);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = filtered.map((r) => `
      <tr>
        <td>${format(new Date(r.occurred_at), "yyyy-MM-dd HH:mm")}</td>
        <td>${r.employee_name}</td>
        <td>${r.event}</td>
        <td>${r.action}</td>
        <td>${(r.details || "").replace(/</g, "&lt;")}</td>
        <td>${(r.location || "").replace(/</g, "&lt;")}</td>
        <td>${r.ip || ""}</td>
        <td>${(r.device || "").replace(/</g, "&lt;")}</td>
      </tr>`).join("");
    const missedHtml = missedDays.map((m) => `
      <tr>
        <td>${m.name}</td>
        <td style="text-align:right">${m.loggedDays}</td>
        <td>${m.missed.join(", ") || "—"}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><title>User Activity Report</title>
      <style>
        *{box-sizing:border-box;font-family:Arial,sans-serif;color:#000}
        body{margin:16px}
        h1{margin:0 0 4px;font-size:18px}
        h2{margin:16px 0 8px;font-size:14px;border-bottom:1px solid #000;padding-bottom:2px}
        .meta{font-size:11px;margin-bottom:10px}
        .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:10px}
        .stat{border:1px solid #000;padding:6px}
        .stat .l{font-size:10px}
        .stat .v{font-size:16px;font-weight:bold}
        table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
        th,td{border:1px solid #000;padding:4px 6px;text-align:left;vertical-align:top}
        th{background:#eee}
        @media print{@page{size:A4 landscape;margin:10mm}}
      </style></head><body>
      <h1>Great Agro Coffee — User Activity &amp; Login Audit Report</h1>
      <div class="meta">
        A member of Hello YEDA COFFEE COMPANY LIMITED • P.O Box 431420, Kasese, Uganda<br/>
        Period: ${startDate} to ${endDate} • Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}<br/>
        Employee: ${employee === "all" ? "All" : employee} • Event: ${event === "all" ? "All" : event}
      </div>
      <div class="stats">
        <div class="stat"><div class="l">Total Events</div><div class="v">${stats.total}</div></div>
        <div class="stat"><div class="l">Unique Users</div><div class="v">${stats.uniqueUsers}</div></div>
        <div class="stat"><div class="l">Logins</div><div class="v">${stats.logins}</div></div>
        <div class="stat"><div class="l">Sessions</div><div class="v">${stats.sessions}</div></div>
        <div class="stat"><div class="l">Locations</div><div class="v">${stats.locations}</div></div>
        <div class="stat"><div class="l">Actions</div><div class="v">${stats.actions}</div></div>
      </div>
      <h2>Activity Timeline (${filtered.length})</h2>
      <table><thead><tr>
        <th>When</th><th>Employee</th><th>Event</th><th>Action</th><th>Details</th><th>Location</th><th>IP</th><th>Device</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <h2>Login Coverage &amp; Missed Days</h2>
      <table><thead><tr>
        <th>Employee</th><th>Days Logged In</th><th>Days Missed</th>
      </tr></thead><tbody>${missedHtml || `<tr><td colspan="3">No login data</td></tr>`}</tbody></table>
      <script>window.onload=()=>{setTimeout(()=>{window.print();},300);}</script>
      </body></html>`);
    w.document.close();
  };

  const handleExportCSV = () => {
    const headers = ["When", "Employee", "Email", "Event", "Action", "Details", "Location", "IP", "Device"];
    const rows = filtered.map((r) => [
      format(new Date(r.occurred_at), "yyyy-MM-dd HH:mm"),
      r.employee_name,
      r.employee_email,
      r.event,
      r.action,
      (r.details || "").replace(/"/g, '""'),
      (r.location || "").replace(/"/g, '""'),
      r.ip,
      (r.device || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="User Activity Report" subtitle="Comprehensive login, session, location & action audit trail">
      <div className="space-y-6">
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <Label>From</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>Employee</Label>
                <Select value={employee} onValueChange={setEmployee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="SESSION">Session</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                    <SelectItem value="LOCATION">Location</SelectItem>
                    <SelectItem value="ACTION">Action (Audit)</SelectItem>
                    <SelectItem value="ACTIVITY">Activity (Page / Form)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Label>Search (name, action, IP, location, device)</Label>
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" /> Print with Header
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Unique Users</p><p className="text-2xl font-bold">{stats.uniqueUsers}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Logins</p><p className="text-2xl font-bold text-emerald-600">{stats.logins}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Sessions</p><p className="text-2xl font-bold text-blue-600">{stats.sessions}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Locations</p><p className="text-2xl font-bold text-amber-600">{stats.locations}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Actions</p><p className="text-2xl font-bold text-purple-600">{stats.actions}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Activity</p><p className="text-2xl font-bold text-indigo-600">{stats.activities}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Activity Timeline ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No activity found for these filters</TableCell></TableRow>
                ) : filtered.slice(0, 1000).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.occurred_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{r.employee_name}</div>
                      {r.employee_email && r.employee_email !== r.employee_name && (
                        <div className="text-xs text-muted-foreground">{r.employee_email}</div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className={eventColor(r.event)}>{r.event}</Badge></TableCell>
                    <TableCell className="text-sm">{r.action}</TableCell>
                    <TableCell className="text-xs max-w-[260px]" title={r.details}>{r.details || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[220px]" title={r.location}>{r.location || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{r.ip || "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={r.device}>{r.device || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > 1000 && (
              <p className="text-xs text-muted-foreground p-3">Showing first 1,000 rows. Export CSV or Print for the full list ({filtered.length}).</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login Coverage &amp; Missed Days</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Days Logged In</TableHead>
                  <TableHead>Days Missed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missedDays.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No login records in range</TableCell></TableRow>
                ) : missedDays.map((m) => (
                  <TableRow key={m.name}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-right">{m.loggedDays}</TableCell>
                    <TableCell className="text-xs">{m.missed.length === 0 ? "—" : m.missed.join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}