import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface ExcelFile {
  id: string;
  name: string;
  size: number;
  lastModified: string;
  webUrl: string;
}

const fmtSize = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ExcelReports = () => {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["excel-report-files"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("excel-files", { method: "GET" });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Could not load Excel files");
      return (data.files || []) as ExcelFile[];
    },
  });

  const handleDownload = async (file: ExcelFile) => {
    setDownloadingId(file.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/excel-files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "download", id: file.id }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Excel Reports
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                The workbooks the system syncs to OneDrive (GAC-System-Reports). Open them in Excel
                Online or download a copy.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No Excel files found yet. They appear here after the first sync runs.
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileSpreadsheet className="h-8 w-8 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtSize(f.size)}
                        {f.lastModified && (
                          <> · Updated {format(parseISO(f.lastModified), "dd MMM yyyy, HH:mm")}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {f.webUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={f.webUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open in Excel
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleDownload(f)}
                      disabled={downloadingId === f.id}
                    >
                      {downloadingId === f.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExcelReports;
