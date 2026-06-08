import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pushToExcel, type ExcelPushPayload } from "@/lib/excelExport";

interface Props {
  getPayload: () => ExcelPushPayload | Promise<ExcelPushPayload>;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * One-click "Export to my Excel" button.
 * Pushes the provided dataset into a workbook in the connected OneDrive
 * (admin's) at /GAC-System-Reports/<workbook>.xlsx.
 */
export function ExportToExcelButton({ getPayload, label = "Export to Excel", variant = "outline", size = "sm" }: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    setBusy(true);
    try {
      const payload = await getPayload();
      const res = await pushToExcel(payload);
      toast({
        title: "Synced to Excel",
        description: `${res.rows} rows → ${res.workbook} / ${res.sheet}`,
      });
    } catch (e: any) {
      toast({
        title: "Excel sync failed",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={run} disabled={busy} variant={variant} size={size}>
      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
      {busy ? "Syncing…" : label}
    </Button>
  );
}