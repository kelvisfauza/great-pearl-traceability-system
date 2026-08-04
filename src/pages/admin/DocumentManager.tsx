import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Folder, FileText, Download, Eye, RefreshCw, ChevronRight, Search, HardDrive } from "lucide-react";
import { format } from "date-fns";

const BUCKETS: { id: string; label: string }[] = [
  { id: "attendance-documents", label: "Attendance Documents" },
  { id: "budget-receipts", label: "Budget Receipts" },
  { id: "call-recordings", label: "Call Recordings" },
  { id: "chat-attachments", label: "Chat Attachments" },
  { id: "contract-documents", label: "Contract Documents" },
  { id: "contracts", label: "Contracts" },
  { id: "dispatch-attachments", label: "Dispatch Attachments" },
  { id: "job-applications", label: "Job Applications" },
  { id: "loan-documents", label: "Loan Documents" },
  { id: "market-screenshots", label: "Market Screenshots" },
  { id: "payment_documents", label: "Payment Documents" },
  { id: "payment-receipts", label: "Payment Receipts" },
  { id: "profile_pictures", label: "Profile Pictures" },
  { id: "report-documents", label: "Report Documents" },
  { id: "requisition-documents", label: "Requisition Documents" },
  { id: "sales-documents", label: "Sales Documents" },
  { id: "statements", label: "Statements" },
];

interface Entry {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  metadata: { size?: number; mimetype?: string } | null;
}

const formatSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function DocumentManager() {
  const { toast } = useToast();
  const [bucket, setBucket] = useState<string>(BUCKETS[0].id);
  const [prefix, setPrefix] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
    setLoading(false);
    if (error) {
      setEntries([]);
      toast({ title: "Could not load files", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((data ?? []) as Entry[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, prefix]);

  const openFile = async (name: string, download: boolean) => {
    const path = prefix ? `${prefix}/${name}` : name;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300, { download });
    if (error || !data?.signedUrl) {
      toast({ title: "Unable to open file", description: error?.message ?? "No URL returned", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const crumbs = prefix ? prefix.split("/") : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
    const folders = list.filter((e) => !e.id);
    const files = list.filter((e) => !!e.id);
    return { folders, files };
  }, [entries, search]);

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardDrive className="h-6 w-6" /> Document Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse, preview and download every file uploaded across the system.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Storage areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[70vh] overflow-y-auto">
              {BUCKETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setBucket(b.id); setPrefix(""); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    bucket === b.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  <button className="hover:underline" onClick={() => setPrefix("")}>
                    {BUCKETS.find((b) => b.id === bucket)?.label}
                  </button>
                  {crumbs.map((c, i) => (
                    <span key={i} className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <button
                        className="hover:underline"
                        onClick={() => setPrefix(crumbs.slice(0, i + 1).join("/"))}
                      >
                        {c}
                      </button>
                    </span>
                  ))}
                </CardTitle>
                <Badge variant="secondary">
                  {filtered.folders.length} folders · {filtered.files.length} files
                </Badge>
              </div>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search in this folder..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prefix && (
                      <TableRow className="cursor-pointer" onClick={() => setPrefix(crumbs.slice(0, -1).join("/"))}>
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          ← Back
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.folders.map((f) => (
                      <TableRow
                        key={`d-${f.name}`}
                        className="cursor-pointer"
                        onClick={() => setPrefix(prefix ? `${prefix}/${f.name}` : f.name)}
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          <Folder className="h-4 w-4 text-amber-500" /> {f.name}
                        </TableCell>
                        <TableCell>—</TableCell>
                        <TableCell>—</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">Open</TableCell>
                      </TableRow>
                    ))}
                    {filtered.files.map((f) => (
                      <TableRow key={`f-${f.name}`}>
                        <TableCell className="font-medium flex items-center gap-2 break-all">
                          <FileText className="h-4 w-4 text-muted-foreground" /> {f.name}
                        </TableCell>
                        <TableCell>{formatSize(f.metadata?.size)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {f.created_at ? format(new Date(f.created_at), "dd MMM yyyy HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => openFile(f.name, false)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openFile(f.name, true)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && filtered.folders.length === 0 && filtered.files.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No files here.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
