import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Columns2, History } from 'lucide-react';
import type { Quotation, QuotationRevision } from '@/hooks/useQuotations';
import QuotationViewer from './QuotationViewer';

interface Version {
  key: string;
  label: string;
  amount: number | null;
  file_path: string | null;
  file_name: string | null;
  note: string | null;
  by: string | null;
  at: string;
}

const fmt = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat('en-UG').format(n));

/** Every proposed version of a quotation (original + revisions), with side-by-side comparison. */
const QuotationJourney = ({ quotation: q, revisions }: { quotation: Quotation; revisions: QuotationRevision[] }) => {
  const versions = useMemo<Version[]>(() => {
    const first = revisions[0];
    const list: Version[] = [{
      key: 'v0',
      label: 'Original',
      amount: first ? first.previous_amount : q.amount,
      file_path: first ? first.previous_file_path : q.file_path,
      file_name: first ? first.previous_file_name : q.file_name,
      note: q.notes,
      by: q.submitted_by,
      at: q.created_at,
    }];
    revisions.forEach((r) => list.push({
      key: r.id,
      label: `Revision ${r.revision_number}`,
      amount: r.amount,
      file_path: r.file_path,
      file_name: r.file_name,
      note: r.changes_summary,
      by: r.attached_by,
      at: r.created_at,
    }));
    return list;
  }, [q, revisions]);

  const [left, setLeft] = useState(versions[0].key);
  const [right, setRight] = useState(versions[versions.length - 1].key);
  const [compare, setCompare] = useState(false);
  const [viewKey, setViewKey] = useState<string | null>(null);

  const L = versions.find((v) => v.key === left) || versions[0];
  const R = versions.find((v) => v.key === right) || versions[versions.length - 1];
  const original = versions[0].amount;
  const latest = versions[versions.length - 1].amount;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Quotation journey ({versions.length} version{versions.length > 1 ? 's' : ''})</p>
        {versions.length > 1 && original != null && latest != null && original !== latest && (
          <Badge variant={latest < original ? 'secondary' : 'destructive'}>
            {latest < original ? 'Saved' : 'Increased'} {q.currency} {fmt(Math.abs(original - latest))} ({Math.round((Math.abs(original - latest) / original) * 100)}%)
          </Badge>
        )}
        {versions.length > 1 && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setCompare((c) => !c)}>
            <Columns2 className="h-4 w-4 mr-1" /> {compare ? 'Close comparison' : 'Compare side by side'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="text-left py-1 pr-2">Version</th>
              <th className="text-right py-1 pr-2">Proposed price</th>
              <th className="text-right py-1 pr-2">Change</th>
              <th className="text-left py-1 pr-2">What changed</th>
              <th className="text-left py-1 pr-2">By / when</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {versions.map((v, i) => {
              const prev = i > 0 ? versions[i - 1].amount : null;
              const diff = prev != null && v.amount != null ? v.amount - prev : null;
              return (
                <tr key={v.key} className="border-b align-top">
                  <td className="py-1.5 pr-2 font-medium whitespace-nowrap">
                    {v.label}{i === versions.length - 1 && versions.length > 1 ? ' (current)' : ''}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-semibold whitespace-nowrap">{q.currency} {fmt(v.amount)}</td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    {diff == null || diff === 0 ? '—' : (
                      <span className={`inline-flex items-center gap-0.5 ${diff < 0 ? 'text-primary' : 'text-destructive'}`}>
                        {diff < 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}{fmt(Math.abs(diff))}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">{v.note || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{v.by || '—'}<br />{new Date(v.at).toLocaleString()}</td>
                  <td className="py-1.5">
                    <Button size="sm" variant="ghost" disabled={!v.file_path} onClick={() => setViewKey(viewKey === v.key ? null : v.key)}>
                      {viewKey === v.key ? 'Hide' : 'View'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewKey && !compare && (() => {
        const v = versions.find((x) => x.key === viewKey)!;
        return <QuotationViewer path={v.file_path} name={`${v.label} — ${v.file_name || ''}`} height={420} />;
      })()}

      {compare && (
        <div className="grid gap-3 md:grid-cols-2">
          {[{ v: L, set: setLeft, val: left }, { v: R, set: setRight, val: right }].map((side, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">{idx === 0 ? 'Left' : 'Right'}</Label>
                  <Select value={side.val} onValueChange={side.set}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {versions.map((v) => <SelectItem key={v.key} value={v.key}>{v.label} — {q.currency} {fmt(v.amount)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <QuotationViewer path={side.v.file_path} name={side.v.file_name} height={460} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotationJourney;
