import operations from '@/assets/department-stamps/operations.png.asset.json';
import quality from '@/assets/department-stamps/quality.png.asset.json';
import finance from '@/assets/department-stamps/finance.png.asset.json';
import procurement from '@/assets/department-stamps/procurement.png.asset.json';
import supervisor from '@/assets/department-stamps/supervisor.png.asset.json';
import business from '@/assets/department-stamps/business.png.asset.json';
import { departmentStampDate, type DepartmentStampKey } from '@/lib/departmentStampRules';
import type { jsPDF } from 'jspdf';

const templates = {
  operations: { url: operations.url, x: 0.514, y: 0.461, width: 0.35, angle: -3, label: 'Operations Manager' },
  quality: { url: quality.url, x: 0.50, y: 0.50, width: 0.58, angle: 12, label: 'Quality Department' },
  finance: { url: finance.url, x: 0.50, y: 0.50, width: 0.54, angle: -7, label: 'Finance Department' },
  procurement: { url: procurement.url, x: 0.51, y: 0.51, width: 0.42, angle: -5, label: 'Procurement' },
  supervisor: { url: supervisor.url, x: 0.49, y: 0.50, width: 0.57, angle: 0, label: 'Supervisor' },
  business: { url: business.url, x: 0.50, y: 0.40, width: 0.49, angle: 0, label: 'Business stamp' },
} satisfies Record<DepartmentStampKey, { url: string; x: number; y: number; width: number; angle: number; label: string }>;

const images = new Map<DepartmentStampKey, Promise<HTMLImageElement>>();
function loadStamp(key: DepartmentStampKey) {
  const existing = images.get(key);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`The ${templates[key].label} stamp could not be loaded.`));
    image.src = templates[key].url;
  });
  images.set(key, promise);
  promise.catch(() => images.delete(key));
  return promise;
}

/** Replace the photographed date in the image, not a second date alongside it. */
export async function datedDepartmentStamp(key: DepartmentStampKey, at: string | Date = new Date()): Promise<string> {
  const image = await loadStamp(key);
  const template = templates[key];
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth * 4; canvas.height = image.naturalHeight * 4;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The document stamp could not be prepared.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width * template.x, canvas.height * template.y);
  ctx.rotate(template.angle * Math.PI / 180);
  const width = canvas.width * template.width;
  const height = canvas.height * 0.145;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-width * 0.53, -height * 0.55, width * 1.06, height * 1.1);
  ctx.fillStyle = '#bf2546'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${height * 0.78}px Arial`;
  ctx.fillText(departmentStampDate(at), 0, 0, width);
  return canvas.toDataURL('image/png');
}

export async function addDepartmentStampPdf(doc: jsPDF, key: DepartmentStampKey, x: number, y: number, width: number, maxHeight: number, at: string | Date = new Date()) {
  const image = await datedDepartmentStamp(key, at);
  const props = doc.getImageProperties(image);
  const scale = Math.min(width / props.width, maxHeight / props.height);
  doc.addImage(image, 'PNG', x + (width - props.width * scale) / 2, y, props.width * scale, props.height * scale);
}

export async function departmentStampHtml(key: DepartmentStampKey, at: string | Date = new Date()) {
  const url = await datedDepartmentStamp(key, at);
  return `<img src="${url}" alt="${templates[key].label} — ${departmentStampDate(at)}" style="display:block;width:110px;height:78px;object-fit:contain" />`;
}