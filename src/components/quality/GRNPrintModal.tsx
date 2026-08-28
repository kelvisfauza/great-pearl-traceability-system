import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { Printer } from 'lucide-react';
import { GRNDocumentData, getGRNPreviewHTML, getGRNPrintDocumentHTML } from '@/utils/grnPrintTemplate';
import { addToPrintQueue } from '@/lib/printQueue';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { stripLegacySupplierSuffix } from '@/utils/supplierDisplay';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { getGrnPayCode } from '@/utils/grnPayCode';
import { getGrnScanQrDataUrl } from '@/utils/grnScanUrl';
import { getGrnBarcodeDataUrl } from '@/utils/grnBarcode';


interface GRNPrintModalProps {
  open: boolean;
  onClose: () => void;
  grnData: GRNDocumentData | null;
  onPrinted?: () => void;
  hideFinanceCopy?: boolean;
}

const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ open, onClose, grnData, onPrinted, hideFinanceCopy = false }) => {
  const { createVerification } = useDocumentVerification();
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [supplierInfo, setSupplierInfo] = useState<{
    bank_name?: string | null;
    account_name?: string | null;
    account_number?: string | null;
    phone?: string | null;
    email?: string | null;
    origin?: string | null;
    code?: string | null;
    id?: string | null;
  } | null>(null);
  const [recoveries, setRecoveries] = useState<
    Array<{ type: "advance" | "expense"; description: string; date?: string; amount: number }>
  >([]);
  const { trackActivity } = useActivityTracker();
  const [payCode, setPayCode] = useState<string | undefined>(undefined);
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined);

  // Guarantee every printed GRN carries a scannable QR (generated locally, no network needed)
  useEffect(() => {
    let cancelled = false;
    const buildQr = async () => {
      if (!open || !grnData?.grnNumber) return;
      const code = grnData.payCode || (await getGrnPayCode(grnData.grnNumber)) || undefined;
      const url = await getGrnScanQrDataUrl(grnData.grnNumber, 220, code);
      if (cancelled) return;
      setPayCode(code);
      setQrDataUrl(url);
    };
    buildQr();
    return () => { cancelled = true; };
  }, [open, grnData?.grnNumber, grnData?.payCode]);

  useEffect(() => {
    const generateVerification = async () => {
      if (open && grnData && !verificationCode) {
        const code = await createVerification({
          type: 'document',
          subtype: 'Goods Received Note (GRN)',
          issued_to_name: grnData.supplierName,
          reference_no: grnData.grnNumber,
          meta: {
            coffeeType: grnData.coffeeType,
            totalKgs: grnData.totalKgs,
            unitPrice: grnData.unitPrice,
            assessedBy: grnData.assessedBy,
          },
        });
        setVerificationCode(code);
      }
    };

    generateVerification();
  }, [open, grnData, verificationCode, createVerification]);

  useEffect(() => {
    if (!open) {
      setVerificationCode(null);
      setSupplierInfo(null);
      setRecoveries([]);
      setPayCode(undefined);
      setQrDataUrl(undefined);
    }
  }, [open]);

  // Fetch supplier address + bank details from the system by supplier name
  useEffect(() => {
    const fetchSupplier = async () => {
      if (!open || !grnData?.supplierName) return;

      // If GRN has supplier_id, prefer it
      const supplierId = (grnData as any).supplierId;
      if (supplierId) {
        const { data } = await supabase
          .from('suppliers')
          .select('id, bank_name, account_name, account_number, phone, email, origin, code, name')
          .eq('id', supplierId)
          .maybeSingle();
        if (data) { setSupplierInfo(data as any); return; }
      }

      const rawName = grnData.supplierName.trim();
      const cleaned = stripLegacySupplierSuffix(rawName).trim();

      // Try if name contains a code like "GPC 00019"
      const codeMatch = rawName.match(/(GPC\s*\d+)/i);
      if (codeMatch) {
        const { data } = await supabase
          .from('suppliers')
          .select('id, bank_name, account_name, account_number, phone, email, origin, code, name')
          .ilike('code', codeMatch[1].replace(/\s+/g, ' '))
          .maybeSingle();
        if (data) { setSupplierInfo(data as any); return; }
      }

      // 1. Exact (case-insensitive) match
      let { data } = await supabase
        .from('suppliers')
        .select('id, bank_name, account_name, account_number, phone, email, origin, code, name')
        .ilike('name', cleaned)
        .maybeSingle();

      // 2. Contains match — supplier name contains the GRN-provided name
      if (!data) {
        const res = await supabase
          .from('suppliers')
          .select('id, bank_name, account_name, account_number, phone, email, origin, code, name')
          .ilike('name', `%${cleaned}%`)
          .limit(5);
        if (res.data && res.data.length > 0) {
          // Prefer one with bank/account details
          const withBank = res.data.find((s: any) => s.bank_name || s.account_number);
          data = (withBank || res.data[0]) as any;
        }
      }

      // 3. Token match — try the longest distinctive word
      if (!data) {
        const tokens = cleaned.split(/\s+/).filter(t => t.length >= 4).sort((a, b) => b.length - a.length);
        for (const tok of tokens) {
          const res = await supabase
            .from('suppliers')
            .select('id, bank_name, account_name, account_number, phone, email, origin, code, name')
            .ilike('name', `%${tok}%`)
            .limit(5);
          if (res.data && res.data.length > 0) {
            const withBank = res.data.find((s: any) => s.bank_name || s.account_number);
            data = (withBank || res.data[0]) as any;
            break;
          }
        }
      }

      if (data) setSupplierInfo(data as any);
    };
    fetchSupplier();
  }, [open, grnData?.supplierName]);

  // Fetch outstanding supplier advances & expenses (recoveries)
  useEffect(() => {
    const fetchRecoveries = async () => {
      if (!open || !supplierInfo?.id) return;

      const [advRes, expRes] = await Promise.all([
        supabase
          .from('supplier_advances')
          .select('description, issued_at, outstanding_ugx')
          .eq('supplier_id', supplierInfo.id)
          .eq('is_closed', false)
          .gt('outstanding_ugx', 0),
        (supabase as any)
          .from('supplier_expenses')
          .select('description, expense_date, outstanding_ugx')
          .eq('supplier_id', supplierInfo.id)
          .eq('is_closed', false)
          .gt('outstanding_ugx', 0),
      ]);

      const items: Array<{ type: "advance" | "expense"; description: string; date?: string; amount: number }> = [];

      (advRes.data || []).forEach((a: any) => {
        items.push({
          type: "advance",
          description: a.description || "Cash advance",
          date: a.issued_at ? new Date(a.issued_at).toLocaleDateString("en-GB") : undefined,
          amount: Number(a.outstanding_ugx) || 0,
        });
      });

      (expRes.data || []).forEach((e: any) => {
        items.push({
          type: "expense",
          description: e.description || "Expense paid on behalf",
          date: e.expense_date ? new Date(e.expense_date).toLocaleDateString("en-GB") : undefined,
          amount: Number(e.outstanding_ugx) || 0,
        });
      });

      setRecoveries(items);
    };
    fetchRecoveries();
  }, [open, supplierInfo?.id]);

  const previewData = useMemo(() => {
    if (!grnData) return null;
    return {
      ...grnData,
      payCode: grnData.payCode || payCode,
      qrDataUrl: grnData.qrDataUrl || qrDataUrl,
      barcodeDataUrl:
        grnData.barcodeDataUrl || getGrnBarcodeDataUrl(grnData.grnNumber, grnData.payCode || payCode),

      verificationCode: verificationCode ?? grnData.verificationCode,
      supplierAddress: grnData.supplierAddress || supplierInfo?.origin || undefined,
      supplierPhone: grnData.supplierPhone || supplierInfo?.phone || undefined,
      supplierEmail: supplierInfo?.email || undefined,
      supplierCode: supplierInfo?.code || undefined,
      supplierBankName: supplierInfo?.bank_name || undefined,
      supplierAccountName: supplierInfo?.account_name || undefined,
      supplierAccountNumber: supplierInfo?.account_number || undefined,
      recoveries,
    };
  }, [grnData, verificationCode, supplierInfo, recoveries, payCode, qrDataUrl]);

  const previewHtml = useMemo(() => {
    if (!previewData) return '';
    return getGRNPreviewHTML(previewData, { includeFinanceCopy: !hideFinanceCopy });
  }, [previewData, hideFinanceCopy]);

  const handlePrint = () => {
    if (!previewData) return;

    trackActivity('report_generation', `printing GRN ${previewData.grnNumber}`, {
      form_name: 'Goods Received Note',
      grn_number: previewData.grnNumber,
    });

    const printWindow = window.open('', '', 'width=1000,height=1200');
    if (!printWindow) return;

    printWindow.document.write(getGRNPrintDocumentHTML([previewData], `GRN - ${previewData.grnNumber}`, { includeFinanceCopy: !hideFinanceCopy }));
    printWindow.document.close();
    onPrinted?.();
  };

  const handleQueue = async () => {
    if (!previewData) return;
    const job = await addToPrintQueue({
      title: `GRN - ${previewData.grnNumber}`,
      docType: 'Goods Received Note',
      html: getGRNPrintDocumentHTML([previewData], `GRN - ${previewData.grnNumber}`, { includeFinanceCopy: !hideFinanceCopy }),
    });
    if (job) {
      toast.success('Added to your print queue', { description: 'Open the Print Queue on the dashboard to print it.' });
      onPrinted?.();
    } else {
      toast.error('Could not add to print queue');
    }
  };

  if (!grnData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            Goods Received Note Preview
          </DialogTitle>
        </DialogHeader>

        <div
          className="overflow-auto rounded-md border bg-background"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="secondary" onClick={handleQueue} className="gap-2">
            <Printer className="h-4 w-4" />
            Add to print queue
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;
