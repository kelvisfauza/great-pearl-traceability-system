import { useState } from 'react';
import QRCode from 'qrcode';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LOGO_URL } from '@/utils/companyBrand';
import { generateVerificationCode, getVerificationUrl } from '@/utils/verificationCode';
import { buildDailyPricesPdf, kampalaDate, type DailyPriceSnapshot } from '@/utils/dailyPricesPdf';

const TodayPricesPrintCard = () => {
  const [busy, setBusy] = useState(false);
  const print = async () => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to print verified prices.');
      const { data, error } = await supabase.from('market_prices').select('*').eq('price_type', 'reference_prices').single();
      if (error || !data) throw new Error('Today’s saved prices could not be loaded. Please try again.');
      const now = new Date();
      const code = generateVerificationCode('document');
      const qr = await QRCode.toDataURL(getVerificationUrl(code), { width: 256, margin: 1, errorCorrectionLevel: 'M' });
      const response = await fetch(LOGO_URL);
      if (!response.ok) throw new Error('The company logo could not be loaded. Please try again.');
      const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read company logo.'));
        reader.onerror = () => reject(new Error('Could not read company logo.'));
        response.blob().then(blob => reader.readAsDataURL(blob)).catch(reject);
      });
      const snapshot = data as DailyPriceSnapshot;
      const doc = buildDailyPricesPdf(snapshot, now, code, qr, logo);
      const { error: verificationError } = await supabase.from('verifications').insert({
        code, type: 'document', subtype: 'daily_coffee_prices', status: 'verified',
        issued_to_name: 'Quality Department', issued_at: now.toISOString(), created_by: user.id,
        reference_no: `PRICES-${now.toISOString().slice(0, 10)}-${code}`,
        meta: { title: "Today's coffee prices", date: kampalaDate(now), prices: snapshot },
      });
      if (verificationError) throw new Error('The verification code could not be registered. No price sheet was issued. Please try again.');
      doc.autoPrint();
      doc.save(`Coffee-Prices-${kampalaDate(now).replaceAll(' ', '-')}.pdf`);
    } catch (error) {
      toast({ title: 'Unable to print prices', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return <Card className="mb-4"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
    <h2 className="font-semibold">Today’s prices</h2>
    <Button onClick={print} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      {busy ? 'Preparing…' : 'Print today’s prices'}
    </Button>
  </CardContent></Card>;
};
export default TodayPricesPrintCard;