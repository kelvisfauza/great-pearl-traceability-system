import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtUGX } from '@/lib/payroll/statutory';

interface Row {
  employee_id: string;
  name: string;
  department?: string;
  gross: number;
  nssfEmployee: number;
  nssfEmployer: number;
  paye: number;
  net: number;
}

export const PayrollPreviewTable = ({ rows }: { rows: Row[] }) => {
  const tot = rows.reduce(
    (a, r) => ({
      gross: a.gross + r.gross,
      nssfE: a.nssfE + r.nssfEmployee,
      nssfR: a.nssfR + r.nssfEmployer,
      paye: a.paye + r.paye,
      net: a.net + r.net,
    }),
    { gross: 0, nssfE: 0, nssfR: 0, paye: 0, net: 0 },
  );
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Dept</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">NSSF 5%</TableHead>
            <TableHead className="text-right">PAYE</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-right text-muted-foreground">NSSF 10% (Employer)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.employee_id + r.name}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.department || '—'}</TableCell>
              <TableCell className="text-right">{fmtUGX(r.gross)}</TableCell>
              <TableCell className="text-right text-orange-600">{fmtUGX(r.nssfEmployee)}</TableCell>
              <TableCell className="text-right text-orange-600">{fmtUGX(r.paye)}</TableCell>
              <TableCell className="text-right font-bold text-emerald-700">{fmtUGX(r.net)}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{fmtUGX(r.nssfEmployer)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted font-bold">
            <TableCell colSpan={2}>Totals ({rows.length})</TableCell>
            <TableCell className="text-right">{fmtUGX(tot.gross)}</TableCell>
            <TableCell className="text-right">{fmtUGX(tot.nssfE)}</TableCell>
            <TableCell className="text-right">{fmtUGX(tot.paye)}</TableCell>
            <TableCell className="text-right text-emerald-700">{fmtUGX(tot.net)}</TableCell>
            <TableCell className="text-right">{fmtUGX(tot.nssfR)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};