import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { getStandardPrintStyles } from '@/utils/printStyles';
import { getStandardPrintFooter } from '@/components/print/PrintFooter';

interface TruckData {
  truck_number: string;
  total_bags_loaded: number;
  total_weight_store: number;
  traceability_confirmed: boolean;
  lot_batch_references: string;
  quality_report_attached: boolean;
}

interface BuyerVerification {
  truck_number: number;
  buyer_bags_count: number;
  buyer_weight: number;
  store_weight: number;
  difference: number;
}

interface DispatchReport {
  id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  dispatch_date: string;
  dispatch_location: string;
  coffee_type: string;
  destination_buyer: string;
  dispatch_supervisor: string;
  vehicle_registrations: string;
  trucks: TruckData[];
  buyer_verification: BuyerVerification[];
  quality_checked_by_buyer: boolean;
  buyer_quality_remarks: string;
  bags_deducted: number;
  deduction_reasons: string[];
  total_deducted_weight: number;
  remarks: string;
  attachment_url: string | null;
  attachment_name: string | null;
  status: string;
}

interface PrintDispatchReportsProps {
  reports: DispatchReport[];
}

const PrintDispatchReports = ({ reports }: PrintDispatchReportsProps) => {
  const [period, setPeriod] = useState<string>('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [open, setOpen] = useState(false);

  const getFilteredReports = () => {
    const now = new Date();
    let from: Date, to: Date;

    if (period === 'week') {
      from = startOfWeek(now, { weekStartsOn: 1 });
      to = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === 'month') {
      from = startOfMonth(now);
      to = endOfMonth(now);
    } else {
      if (!customFrom || !customTo) return [];
      from = parseISO(customFrom);
      to = parseISO(customTo);
    }

    return reports.filter(r => {
      const d = parseISO(r.dispatch_date);
      return isWithinInterval(d, { start: from, end: to });
    });
  };

  const handlePrint = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) return;

    const now = new Date();
    let periodLabel = '';
    if (period === 'week') {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      const we = endOfWeek(now, { weekStartsOn: 1 });
      periodLabel = `Week: ${format(ws, 'dd MMM yyyy')} - ${format(we, 'dd MMM yyyy')}`;
    } else if (period === 'month') {
      periodLabel = `Month: ${format(now, 'MMMM yyyy')}`;
    } else {
      periodLabel = `${format(parseISO(customFrom), 'dd MMM yyyy')} - ${format(parseISO(customTo), 'dd MMM yyyy')}`;
    }

    // Compute summary totals
    let grandTotalWeight = 0;
    let grandTotalBuyerWeight = 0;
    let grandTotalDifference = 0;
    let grandTotalBags = 0;

    filtered.forEach(r => {
      const trucks = Array.isArray(r.trucks) ? r.trucks : [];
      const verification = Array.isArray(r.buyer_verification) ? r.buyer_verification : [];
      grandTotalBags += trucks.reduce((s, t) => s + (t.total_bags_loaded || 0), 0);
      grandTotalWeight += trucks.reduce((s, t) => s + (t.total_weight_store || 0), 0);
      grandTotalBuyerWeight += verification.reduce((s, v) => s + (v.buyer_weight || 0), 0);
      grandTotalDifference += verification.reduce((s, v) => s + (v.difference || 0), 0);
    });

    const reportRows = filtered.map((r, idx) => {
      const trucks = Array.isArray(r.trucks) ? r.trucks : [];
      const verification = Array.isArray(r.buyer_verification) ? r.buyer_verification : [];
      const storeWt = trucks.reduce((s, t) => s + (t.total_weight_store || 0), 0);
      const buyerWt = verification.reduce((s, v) => s + (v.buyer_weight || 0), 0);
      const diff = verification.reduce((s, v) => s + (v.difference || 0), 0);
      const bags = trucks.reduce((s, t) => s + (t.total_bags_loaded || 0), 0);

      // Detail rows for each truck
      const truckDetailRows = trucks.map((t, ti) => {
        const v = verification[ti];
        return `
          <tr>
            <td>${ti === 0 ? (idx + 1) : ''}</td>
            <td>${ti === 0 ? format(parseISO(r.dispatch_date), 'dd/MM/yyyy') : ''}</td>
            <td>${ti === 0 ? r.destination_buyer : ''}</td>
            <td>${ti === 0 ? r.coffee_type : ''}</td>
            <td>${t.truck_number || `Truck ${ti + 1}`}</td>
            <td class="amount">${t.total_bags_loaded || 0}</td>
            <td class="amount">${(t.total_weight_store || 0).toLocaleString()}</td>
            <td class="amount">${v ? v.buyer_weight?.toLocaleString() || '-' : '-'}</td>
            <td class="amount ${v && v.difference > 0 ? 'positive' : v && v.difference < 0 ? 'negative' : ''}">${v ? (v.difference > 0 ? '+' : '') + v.difference?.toFixed(1) : '-'}</td>
            <td>${ti === 0 ? (r.remarks || '-') : ''}</td>
          </tr>
        `;
      }).join('');

      // If no trucks, show summary row
      if (trucks.length === 0) {
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${format(parseISO(r.dispatch_date), 'dd/MM/yyyy')}</td>
            <td>${r.destination_buyer}</td>
            <td>${r.coffee_type}</td>
            <td>-</td>
            <td class="amount">0</td>
            <td class="amount">0</td>
            <td class="amount">0</td>
            <td class="amount">0</td>
            <td>${r.remarks || '-'}</td>
          </tr>
        `;
      }

      return truckDetailRows;
    }).join('');

    const html = `
      <html>
      <head>
        <title>EUDR Dispatch Reports - ${periodLabel}</title>
        <style>${getStandardPrintStyles()}</style>
      </head>
      <body>
        <div class="print-header">
          <div class="company-name">Great Pearl Coffee Factory Ltd.</div>
          <div class="company-details">Delivering coffee from the heart of Rwenzori<br/>+256781121639 / +256778536681</div>
          <div class="document-title">EUDR Dispatch Comparison Reports</div>
          <div class="document-info">Period: ${periodLabel} | Generated: ${format(now, 'dd MMM yyyy HH:mm')}</div>
        </div>

        <div class="content-section">
          <div class="section-title">Summary</div>
          <table>
            <tr><td><strong>Total Reports:</strong></td><td>${filtered.length}</td><td><strong>Total Bags:</strong></td><td>${grandTotalBags.toLocaleString()}</td></tr>
            <tr><td><strong>Store Weight:</strong></td><td>${grandTotalWeight.toLocaleString()} kg</td><td><strong>Buyer Weight:</strong></td><td>${grandTotalBuyerWeight.toLocaleString()} kg</td></tr>
            <tr><td><strong>Total Difference:</strong></td><td class="${grandTotalDifference > 0 ? 'positive' : grandTotalDifference < 0 ? 'negative' : ''}">${grandTotalDifference > 0 ? '+' : ''}${grandTotalDifference.toFixed(1)} kg</td><td></td><td></td></tr>
          </table>
        </div>

        <div class="content-section">
          <div class="section-title">Dispatch Details</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Buyer</th>
                <th>Coffee</th>
                <th>Vehicle</th>
                <th>Bags</th>
                <th>Store Wt (kg)</th>
                <th>Buyer Wt (kg)</th>
                <th>Diff (kg)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${reportRows}
              <tr class="total-row">
                <td colspan="5"><strong>TOTALS</strong></td>
                <td class="amount"><strong>${grandTotalBags.toLocaleString()}</strong></td>
                <td class="amount"><strong>${grandTotalWeight.toLocaleString()}</strong></td>
                <td class="amount"><strong>${grandTotalBuyerWeight.toLocaleString()}</strong></td>
                <td class="amount ${grandTotalDifference > 0 ? 'positive' : grandTotalDifference < 0 ? 'negative' : ''}"><strong>${grandTotalDifference > 0 ? '+' : ''}${grandTotalDifference.toFixed(1)}</strong></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="signatures">
          <div>
            <div class="signature-line"></div>
            <p>Prepared By</p>
          </div>
          <div>
            <div class="signature-line"></div>
            <p>Store Manager</p>
          </div>
          <div>
            <div class="signature-line"></div>
            <p>Approved By</p>
          </div>
        </div>

        ${getStandardPrintFooter()}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }

    setOpen(false);
  };

  const filtered = getFilteredReports();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          Print Reports
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Dispatch Reports</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From</Label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <Label>To</Label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {filtered.length} report{filtered.length !== 1 ? 's' : ''} found for selected period
          </div>

          <Button onClick={handlePrint} disabled={filtered.length === 0} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print {filtered.length} Report{filtered.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintDispatchReports;
