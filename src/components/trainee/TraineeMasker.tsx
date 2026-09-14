import { useEffect } from 'react';
import { useTraineeMode } from '@/hooks/useTraineeMode';

/**
 * Masks sensitive figures for Trainee accounts directly in the rendered DOM,
 * so every page is covered without touching hundreds of components.
 *
 * Masked: currency amounts (UGX / USh / Shs / USD), price-per-kg values,
 * numbers under money-labelled headers/labels, phone numbers, and anything
 * marked with data-sensitive. Weights, kilograms, dates, grades and codes stay visible.
 */

const MASK = '••••';
const PHONE_MASK = '07•• ••• •••';

const CURRENCY_PREFIX = /\b(UGX|USh|UShs|Shs|Ush|USD|KES|TZS|EUR|GBP)\s*[-+]?\s*\d[\d,]*(\.\d+)?/gi;
const CURRENCY_SUFFIX = /[-+]?\d[\d,]*(\.\d+)?\s*(UGX|USh|UShs|Shs|Ush|USD)\b/gi;
const DOLLAR = /\$\s?\d[\d,]*(\.\d+)?/g;
const PER_KG = /\d[\d,]*(\.\d+)?\s*(\/|per)\s*kg\b/gi;
const PHONE = /(\+?256|\b0)\s?7\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g;
const BARE_NUMBER = /^\s*[-+]?\d[\d,]*(\.\d+)?\s*$/;

const MONEY_LABEL = /(price|amount|total|paid|balance|salary|cost|value|revenue|advance|fee|wage|payment|pay\b|ugx|invoice|budget|loan|debt|owed|earning|income|expense|cash|money|rate|profit|interest|fund|treasury|points|reward|bonus|allowance)/i;
const NOT_MONEY_LABEL = /(kg|kilo|weight|bags?|moisture|quantity|qty|count|number|no\.|#|date|time|grade|score|%|percent|outturn|defect|screen|days?|hours?|phone|id\b)/i;

const processed = new WeakMap<Text, string>();

function inProtectedArea(node: Node): boolean {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return false;
  return Boolean(
    el.closest('[data-trainee-ui], script, style, noscript, [data-trainee-unmasked="true"]')
  );
}

function contextLabel(text: Text): string {
  const parent = text.parentElement;
  if (!parent) return '';
  const parts: string[] = [];
  // Own element attributes
  parts.push(parent.getAttribute('aria-label') || '', parent.getAttribute('title') || '');
  // Table column header
  const cell = parent.closest('td, th');
  if (cell) {
    const row = cell.parentElement as HTMLTableRowElement | null;
    const table = cell.closest('table');
    if (row && table) {
      const idx = Array.from(row.children).indexOf(cell);
      const headRow = table.querySelector('thead tr');
      const th = headRow?.children[idx];
      if (th) parts.push(th.textContent || '');
    }
  }
  // Sibling label / description (stat cards, key-value rows)
  const prev = parent.previousElementSibling;
  if (prev) parts.push(prev.textContent || '');
  const grand = parent.parentElement;
  if (grand) {
    const gprev = grand.previousElementSibling;
    if (gprev) parts.push(gprev.textContent || '');
    const first = grand.firstElementChild;
    if (first && first !== parent) parts.push(first.textContent || '');
  }
  return parts.join(' | ').slice(0, 300);
}

function maskText(text: Text) {
  if (inProtectedArea(text)) return;
  const original = text.nodeValue || '';
  if (!original.trim()) return;
  if (processed.get(text) === original) return;

  let next = original
    .replace(CURRENCY_PREFIX, (_m, cur) => `${cur} ${MASK}`)
    .replace(CURRENCY_SUFFIX, (_m, _d, cur) => `${MASK} ${cur}`)
    .replace(DOLLAR, `$${MASK}`)
    .replace(PER_KG, `${MASK} /kg`)
    .replace(PHONE, PHONE_MASK);

  if (next === original && BARE_NUMBER.test(original)) {
    const label = contextLabel(text);
    if (MONEY_LABEL.test(label) && !NOT_MONEY_LABEL.test(label)) {
      next = original.replace(/[-+]?\d[\d,]*(\.\d+)?/, MASK);
    }
  }

  if (next !== original) {
    text.nodeValue = next;
    processed.set(text, next);
  }
}

function maskElement(el: Element) {
  if (el.matches?.('[data-sensitive]') && !el.matches('[data-sensitive="chart"]')) {
    if (el.textContent !== MASK) el.textContent = MASK;
  }
  el.querySelectorAll?.('[data-sensitive]:not([data-sensitive="chart"])').forEach((n) => {
    if (n.textContent !== MASK) n.textContent = MASK;
  });
  // Charts with money axes
  const charts: Element[] = [];
  if (el.matches?.('[data-sensitive="chart"]')) charts.push(el);
  el.querySelectorAll?.('[data-sensitive="chart"]').forEach((c) => charts.push(c));
  charts.forEach((c) => {
    if (c.querySelector(':scope > .trainee-chart-cover')) return;
    const h = c as HTMLElement;
    if (getComputedStyle(h).position === 'static') h.style.position = 'relative';
    const cover = document.createElement('div');
    cover.className = 'trainee-chart-cover';
    cover.setAttribute('data-trainee-ui', 'true');
    cover.textContent = 'Hidden for training';
    cover.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);background:hsl(var(--background)/0.7);font-size:0.875rem;color:hsl(var(--muted-foreground));border-radius:inherit;z-index:5;';
    h.appendChild(cover);
  });
  // Money inputs: blur their values
  el.querySelectorAll?.('input, select, textarea').forEach((f) => {
    const input = f as HTMLInputElement;
    if (input.closest('[data-trainee-ui], [data-trainee-unmasked="true"]')) return;
    const hint = [input.placeholder, input.getAttribute('aria-label'), input.name, input.id]
      .filter(Boolean)
      .join(' ');
    const labelEl = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    const label = `${hint} ${labelEl?.textContent || ''}`;
    if (MONEY_LABEL.test(label) && !NOT_MONEY_LABEL.test(label) && !/search|filter/i.test(label)) {
      input.style.filter = 'blur(5px)';
      input.style.userSelect = 'none';
      input.setAttribute('data-trainee-masked', 'true');
    }
  });

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) texts.push(n as Text);
  texts.forEach(maskText);
}

export function TraineeMasker() {
  const trainee = useTraineeMode();

  useEffect(() => {
    if (!trainee) return;

    let scheduled = false;
    const pending = new Set<Node>();

    const flush = () => {
      scheduled = false;
      const nodes = Array.from(pending);
      pending.clear();
      nodes.forEach((node) => {
        if (!node.isConnected) return;
        if (node.nodeType === Node.TEXT_NODE) maskText(node as Text);
        else if (node.nodeType === Node.ELEMENT_NODE) maskElement(node as Element);
      });
    };

    const schedule = (node: Node) => {
      pending.add(node);
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    };

    maskElement(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'characterData') {
          schedule(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((n) => schedule(n));
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    // Print/preview windows of the same origin get no masking, so block them too.
    const originalOpen = window.open;
    window.open = ((..._args: unknown[]) => null) as typeof window.open;

    return () => {
      observer.disconnect();
      window.open = originalOpen;
      document.querySelectorAll('.trainee-chart-cover').forEach((c) => c.remove());
      document.querySelectorAll('[data-trainee-masked="true"]').forEach((i) => {
        (i as HTMLElement).style.filter = '';
        (i as HTMLElement).style.userSelect = '';
        i.removeAttribute('data-trainee-masked');
      });
    };
  }, [trainee]);

  return null;
}

export default TraineeMasker;
