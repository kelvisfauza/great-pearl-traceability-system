import * as XLSX from 'xlsx';

export interface ParsedDay {
  date: string; // yyyy-MM-dd
  punches: string[]; // HH:MM sorted
  arrival: string; // HH:MM (defaulted when no morning tap)
  departure: string; // HH:MM (defaulted when no evening tap)
  status: 'present' | 'absent';
  assumedArrival: boolean;
  assumedDeparture: boolean;
  isWeekend: boolean;
}

export interface ParsedDevicePerson {
  deviceUserId: string;
  deviceName: string;
  department: string;
  days: ParsedDay[];
}

export interface ParsedMachineFile {
  periodStart: string;
  periodEnd: string;
  people: ParsedDevicePerson[];
}

export interface ParseOptions {
  defaultArrival: string;
  defaultDeparture: string;
  middayCutoffHour: number;
  includeWeekends: boolean;
}

const TIME_RE = /([0-2]?\d):([0-5]\d)/g;

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function extractTimes(cell: unknown): string[] {
  if (cell == null) return [];
  const text = String(cell);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  TIME_RE.lastIndex = 0;
  while ((m = TIME_RE.exec(text)) !== null) {
    const h = Number(m[1]);
    if (h > 23) continue;
    out.push(`${pad(h)}:${m[2]}`);
  }
  return out;
}

/** Finds "Attendance date:06-01-2026~06-30-2026" anywhere in the grid. */
function findPeriod(grid: unknown[][]): { start: string; end: string } | null {
  const re = /(\d{2})-(\d{2})-(\d{4})\s*~\s*(\d{2})-(\d{2})-(\d{4})/;
  for (const row of grid) {
    for (const cell of row || []) {
      if (cell == null) continue;
      const m = re.exec(String(cell));
      if (m) {
        return { start: `${m[3]}-${m[1]}-${m[2]}`, end: `${m[6]}-${m[4]}-${m[5]}` };
      }
    }
  }
  return null;
}

function buildDay(date: string, punches: string[], opts: ParseOptions): ParsedDay {
  const d = new Date(`${date}T00:00:00`);
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  const sorted = [...new Set(punches)].sort((a, b) => toMinutes(a) - toMinutes(b));

  if (sorted.length === 0) {
    return {
      date,
      punches: [],
      arrival: '',
      departure: '',
      status: 'absent',
      assumedArrival: false,
      assumedDeparture: false,
      isWeekend,
    };
  }

  const cutoff = opts.middayCutoffHour * 60;
  const morning = sorted.filter((t) => toMinutes(t) < cutoff);
  const evening = sorted.filter((t) => toMinutes(t) >= cutoff);

  // First tap of the day = arrival, last tap = departure.
  const arrival = morning.length ? morning[0] : opts.defaultArrival;
  const departure = evening.length ? evening[evening.length - 1] : opts.defaultDeparture;

  return {
    date,
    punches: sorted,
    arrival,
    departure,
    status: 'present',
    assumedArrival: morning.length === 0,
    assumedDeparture: evening.length === 0,
    isWeekend,
  };
}

/**
 * Parses a biometric-machine "Employee Attendance Record" export
 * (.xls / .xlsx / .csv) into per-employee, per-day arrival/departure times.
 */
export function parseMachineWorkbook(data: ArrayBuffer, opts: ParseOptions): ParsedMachineFile {
  const wb = XLSX.read(data, { type: 'array' });

  let grid: unknown[][] = [];
  for (const name of wb.SheetNames) {
    const g = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: null,
    });
    const hasBlocks = g.some((row) =>
      (row || []).some((c) => c != null && String(c).trim().toLowerCase().startsWith('user id')),
    );
    if (hasBlocks) { grid = g; break; }
    if (!grid.length) grid = g;
  }

  const period = findPeriod(grid);
  const start = period?.start ?? '';
  const end = period?.end ?? '';
  const year = start ? Number(start.slice(0, 4)) : new Date().getFullYear();
  const month = start ? Number(start.slice(5, 7)) : new Date().getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const people: ParsedDevicePerson[] = [];

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i] || [];
    const idIdx = row.findIndex(
      (c) => c != null && String(c).trim().toLowerCase().startsWith('user id'),
    );
    if (idIdx === -1) continue;

    const labelValue = (label: string) => {
      const idx = row.findIndex(
        (c) => c != null && String(c).trim().toLowerCase().startsWith(label),
      );
      if (idx === -1) return '';
      for (let k = idx + 1; k < row.length; k++) {
        if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
      }
      return '';
    };

    const deviceUserId = labelValue('user id');
    const deviceName = labelValue('name');
    const department = labelValue('department');
    if (!deviceName) continue;

    const headerRow = grid[i + 1] || [];
    const colToDay = new Map<number, number>();
    headerRow.forEach((c, idx) => {
      if (c == null) return;
      const n = Number(String(c).trim());
      if (Number.isFinite(n) && n >= 1 && n <= 31) colToDay.set(idx, Math.round(n));
    });
    if (colToDay.size === 0) continue;

    const punchesByDay = new Map<number, string[]>();
    let j = i + 2;
    for (; j < grid.length; j++) {
      const r = grid[j] || [];
      const isNextBlock = r.some(
        (c) => c != null && String(c).trim().toLowerCase().startsWith('user id'),
      );
      if (isNextBlock) break;
      colToDay.forEach((day, colIdx) => {
        const times = extractTimes(r[colIdx]);
        if (times.length) {
          punchesByDay.set(day, [...(punchesByDay.get(day) || []), ...times]);
        }
      });
    }

    const days: ParsedDay[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${pad(month)}-${pad(d)}`;
      const day = buildDay(date, punchesByDay.get(d) || [], opts);
      if (day.isWeekend && !opts.includeWeekends && day.punches.length === 0) continue;
      days.push(day);
    }

    people.push({ deviceUserId, deviceName, department, days });
    i = j - 1;
  }

  return { periodStart: start, periodEnd: end, people };
}

/** Loose name matcher: ignores order, case, punctuation and extra spaces. */
export function matchEmployee<T extends { id: string; name: string }>(
  deviceName: string,
  list: T[],
): T | null {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const target = norm(deviceName);
  if (!target.length) return null;

  let best: { person: T; score: number } | null = null;
  for (const p of list) {
    const parts = norm(p.name || '');
    if (!parts.length) continue;
    const hits = target.filter((t) => parts.includes(t)).length;
    if (!hits) continue;
    const score = hits / Math.max(target.length, 1) + hits / Math.max(parts.length, 1);
    if (!best || score > best.score) best = { person: p, score };
  }
  return best && best.score >= 1 ? best.person : null;
}
