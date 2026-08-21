import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Loader2 } from "lucide-react";

interface Props {
  path?: string | null;
  name?: string | null;
  /** Height of the inline preview */
  height?: number;
}

/** Renders an inline preview of a contract PDF stored in the private `contracts` bucket. */
const ContractPdfViewer = ({ path, name, height = 520 }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!path) { setUrl(null); return; }
    setLoading(true);
    supabase.storage
      .from("contracts")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => { if (active) { setUrl(data?.signedUrl ?? null); setLoading(false); } });
    return () => { active = false; };
  }, [path]);

  if (!path) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No contract document attached.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{name || "Contract document"}</span>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!url}
            onClick={async () => {
              const { data } = await supabase.storage.from("contracts").download(path);
              if (!data) return;
              const objUrl = URL.createObjectURL(data);
              const a = document.createElement("a");
              a.href = objUrl;
              a.download = name || "contract.pdf";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(objUrl);
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : url ? (
        <iframe
          src={url}
          title={name || "Contract document"}
          className="w-full rounded-md border bg-muted"
          style={{ height }}
        />
      ) : (
        <p className="text-sm text-destructive">Could not load the document.</p>
      )}
    </div>
  );
};

export default ContractPdfViewer;
