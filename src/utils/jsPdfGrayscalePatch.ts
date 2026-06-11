// Global jsPDF monkey-patch — forces every generated PDF to render
// in grayscale so company printouts look clean on B&W printers.
// Imported once from main.tsx; affects every jsPDF instance, including
// existing receipt / payslip / loan / contract / report generators.
import { jsPDF } from "jspdf";

type RGB = { r: number; g: number; b: number };

const namedColors: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
};

const parseHex = (hex: string): RGB | null => {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const toRGB = (args: unknown[]): RGB | null => {
  if (args.length === 0) return null;
  const a = args[0];
  if (typeof a === "string") {
    const s = a.trim().toLowerCase();
    if (s.startsWith("#")) return parseHex(s);
    if (namedColors[s]) return namedColors[s];
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return null;
  }
  if (typeof a === "number") {
    if (args.length === 1) return { r: a, g: a, b: a };
    if (args.length >= 3) {
      return { r: a, g: Number(args[1]) || 0, b: Number(args[2]) || 0 };
    }
  }
  return null;
};

// Rec. 601 luma — matches how a B&W printer renders color.
const luma = ({ r, g, b }: RGB) => 0.299 * r + 0.587 * g + 0.114 * b;

const wrap = (name: "setFillColor" | "setTextColor" | "setDrawColor") => {
  const proto = (jsPDF as any).API as any;
  const original = proto[name];
  if (!original || (original as any).__grayscalePatched) return;
  const patched = function (this: any, ...args: unknown[]) {
    const rgb = toRGB(args);
    if (rgb) {
      const g = Math.max(0, Math.min(255, Math.round(luma(rgb))));
      return original.call(this, g, g, g);
    }
    return original.apply(this, args as any);
  };
  (patched as any).__grayscalePatched = true;
  proto[name] = patched;
};

let installed = false;
export const installJsPdfGrayscale = () => {
  if (installed) return;
  installed = true;
  try {
    wrap("setFillColor");
    wrap("setTextColor");
    wrap("setDrawColor");
  } catch (e) {
    console.warn("Failed to install jsPDF grayscale patch", e);
  }
};
