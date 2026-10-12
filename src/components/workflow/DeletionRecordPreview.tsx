import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ExternalLink } from 'lucide-react';

interface Props {
  tableName?: string;
  record?: Record<string, any> | null;
}

const HIDDEN = new Set(['id', 'created_by', 'updated_at']);

const label = (k: string) =>
  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtVal = (k: string, v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (/(_date|_at)$/.test(k) || k === 'date') return fmtDate(v);
  if (typeof v === 'number') return v.toLocaleString('en-UG');
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.every((x) => typeof x !== 'object') ? v.join(', ') : `${v.length} item(s)`;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const Field = ({ name, value }: { name: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground">{name}</p>
    <p className="text-sm font-medium break-words">{value}</p>
  </div>
);

const DispatchReportPreview = ({ r }: { r: Record<string, any> }) => {
  const trucks: any[] = Array.isArray(r.trucks) ? r.trucks : [];
  const verify: any[] = Array.isArray(r.buyer_verification) ? r.buyer_verification : [];
  const totalBags = trucks.reduce((s, t) => s + (Number(t.total_bags_loaded) || 0), 0);
  const totalKg = trucks.reduce((s, t) => s + (Number(t.total_weight_store) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Field name="Dispatch date" value={fmtVal('dispatch_date', r.dispatch_date)} />
        <Field name="Location" value={fmtVal('', r.dispatch_location)} />
        <Field name="Coffee type" value={fmtVal('', r.coffee_type)} />
        <Field name="Buyer / destination" value={fmtVal('', r.destination_buyer)} />
        <Field name="Supervisor" value={fmtVal('', r.dispatch_supervisor)} />
        <Field name="Vehicles" value={fmtVal('', r.vehicle_registrations)} />
        <Field name="Prepared by" value={fmtVal('', r.created_by_name)} />
        <Field name="Created" value={fmtVal('created_at', r.created_at)} />
        <Field name="Status" value={fmtVal('', r.status)} />
        <Field name="Total bags loaded" value={totalBags.toLocaleString('en-UG')} />
        <Field name="Total store weight (kg)" value={totalKg.toLocaleString('en-UG')} />
        <Field name="Bags deducted" value={fmtVal('', r.bags_deducted)} />
      </div>

      {trucks.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Truck</th>
                <th className="text-right p-2">Bags</th>
                <th className="text-right p-2">Store kg</th>
                <th className="text-right p-2">Buyer kg</th>
                <th className="text-right p-2">Difference</th>
                <th className="text-left p-2">Lots / batches</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((t, i) => {
                const v = verify[i] || {};
                return (
                  <tr key={i} className="border-t">
                    <td className="p-2">{t.truck_number || `#${i + 1}`}</td>
                    <td className="p-2 text-right">{fmtVal('', t.total_bags_loaded)}</td>
                    <td className="p-2 text-right">{fmtVal('', t.total_weight_store)}</td>
                    <td className="p-2 text-right">{fmtVal('', v.buyer_weight)}</td>
                    <td className="p-2 text-right">{fmtVal('', v.difference)}</td>
                    <td className="p-2">{t.lot_batch_references || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(r.remarks || r.buyer_quality_remarks) && (
        <div className="grid gap-3">
          {r.remarks && <Field name="Remarks" value={r.remarks} />}
          {r.buyer_quality_remarks && <Field name="Buyer quality remarks" value={r.buyer_quality_remarks} />}
        </div>
      )}

      {r.attachment_url && (
        <a href={r.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
          <ExternalLink className="h-3.5 w-3.5" /> Open attachment {r.attachment_name ? `(${r.attachment_name})` : ''}
        </a>
      )}
    </div>
  );
};

export const DeletionRecordPreview: React.FC<Props> = ({ tableName, record }) => {
  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          Record that will be deleted
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!record ? (
          <p className="text-sm text-muted-foreground">No copy of the record was saved with this request.</p>
        ) : tableName === 'eudr_dispatch_reports' ? (
          <DispatchReportPreview r={record} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(record)
              .filter(([k]) => !HIDDEN.has(k))
              .map(([k, v]) => (
                <Field key={k} name={label(k)} value={fmtVal(k, v)} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeletionRecordPreview;
