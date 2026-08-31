import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Download, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  BLANK_MANUAL_VALUES,
  generateDispatchMonitoringForm,
} from '@/components/expenses/DispatchMonitoringTemplateDownload';

const DispatchMonitoringBlankTemplateDownload = () => {
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    try {
      setBusy(true);
      await generateDispatchMonitoringForm('MANUAL', BLANK_MANUAL_VALUES, { blank: true });
      toast({
        title: 'Blank dispatch form ready',
        description: 'PDF downloaded and print preview opened — fill it in by hand.',
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Failed to generate the template.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" />
          Dispatch Monitoring — Blank (Manual Entry)
        </CardTitle>
        <CardDescription className="text-xs">
          Print an empty A4 dispatch monitoring form for handwritten use in the field — dispatch details, truck
          lines (6 rows), buyer weighing comparison, remarks and signature lines. The form number is written by
          hand, then the record is entered into the system later (Store › Dispatch).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Blank Form for Printing
        </Button>
      </CardContent>
    </Card>
  );
};

export default DispatchMonitoringBlankTemplateDownload;
