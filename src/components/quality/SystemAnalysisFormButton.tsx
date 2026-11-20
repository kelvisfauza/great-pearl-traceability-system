import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { printSystemAnalysisForm } from '@/utils/systemAnalysisFormPdf';
import { fetchDeliveryLabReports } from '@/utils/deliveryLabReports';
import { printOutlookLabReports } from '@/utils/outlookLabReportPdf';

/** Opens the system-generated analysis form for a delivery, built from its saved quality assessment. */
export function SystemAnalysisFormButton({ recordId, batchNumber, assessment }: { recordId?: string | null; batchNumber?: string | null; assessment?: any }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    // Reserve the print window inside the click so pop-up blockers allow it.
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow pop-ups to print the analysis form'); return; }
    win.document.title = 'Preparing analysis form';
    setBusy(true);
    try {
      const reports = await fetchDeliveryLabReports(recordId, batchNumber);
      if (reports.length) {
        const rid = recordId || reports[0]?.linked_delivery_id;
        const { data: delivery, error } = await (supabase as any).from('coffee_records').select('batch_number,date,kilograms,bags,supplier_name,coffee_type').eq('id', rid).maybeSingle();
        if (error) throw error;
        await printOutlookLabReports(reports, delivery, win);
        return;
      }
      let a = assessment;
      if (!a) {
        let q = (supabase as any).from('quality_assessments').select('*').order('created_at', { ascending: false }).limit(1);
        q = recordId ? q.eq('store_record_id', recordId) : q.eq('batch_number', batchNumber);
        const { data, error } = await q;
        if (error) throw error;
        a = data?.[0];
        if (!a && recordId && batchNumber) {
          const r = await (supabase as any).from('quality_assessments').select('*').eq('batch_number', batchNumber).order('created_at', { ascending: false }).limit(1);
          a = r.data?.[0];
        }
      }
      if (!a) { win.close(); toast.error('This delivery has not been assessed by Quality yet.'); return; }
      const rid = recordId || a.store_record_id;
      let delivery: any = null;
      if (rid) {
        const { data } = await (supabase as any).from('coffee_records').select('batch_number,date,kilograms,bags,supplier_name,coffee_type').eq('id', rid).maybeSingle();
        delivery = data;
      }
      await printSystemAnalysisForm(a, delivery, win);
    } catch (e: any) {
      if (!win.closed) win.close();
      toast.error(e?.message || 'Could not open the analysis form');
    } finally { setBusy(false); }
  };
  return (
    <Button size="sm" variant="outline" onClick={open} disabled={busy} title="Quality analysis form">
      <FileText className="h-3.5 w-3.5 mr-1" />{busy ? '...' : 'Analysis'}
    </Button>
  );
}
