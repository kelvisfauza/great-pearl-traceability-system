import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/**
 * Universal search-result highlighter.
 *
 * Any page reached via the AI Command Center carries `?highlight=<id>`
 * and/or `?search=<term>` (batch code, receipt no, ref, phone, etc.).
 * This bridge scans the DOM across the whole app, scrolls to the first
 * match, and applies a temporary pulse ring — so every destination page
 * highlights the exact record without page-specific wiring.
 */
const HIGHLIGHT_CLASSES = [
  "ring-2",
  "ring-primary",
  "ring-offset-2",
  "rounded-md",
  "animate-pulse-highlight",
];

function normalize(v: string) {
  return v.trim().toLowerCase();
}

function findTargets(needles: string[]): HTMLElement[] {
  if (needles.length === 0) return [];
  const results = new Set<HTMLElement>();

  for (const raw of needles) {
    const needle = normalize(raw);
    if (!needle || needle.length < 3) continue;

    // 1. explicit id anchors we already emit (row-<id>, record-<id>, item-<id>)
    for (const prefix of ["row-", "record-", "item-", "batch-", "assessment-", "receipt-"]) {
      const el = document.getElementById(`${prefix}${raw}`);
      if (el) results.add(el);
    }

    // 2. any element with data-record-id / data-batch / data-ref matching
    document
      .querySelectorAll<HTMLElement>(
        `[data-record-id="${raw}"],[data-batch="${raw}"],[data-ref="${raw}"],[data-reference="${raw}"]`,
      )
      .forEach((el) => results.add(el));

    // 3. table rows / cards containing the literal text
    const scannable = document.querySelectorAll<HTMLElement>(
      "tr, [role='row'], .card, [data-card], article, li",
    );
    scannable.forEach((el) => {
      const txt = el.textContent?.toLowerCase() || "";
      if (txt.includes(needle)) results.add(el);
    });

    if (results.size >= 8) break;
  }

  return Array.from(results).slice(0, 8);
}

const GlobalHighlightBridge = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    const search = searchParams.get("search");
    const batch = searchParams.get("batch");
    const reference = searchParams.get("reference") || searchParams.get("ref");
    const grn = searchParams.get("grn");
    const receiptNo = searchParams.get("receipt_no");

    const needles = [highlight, search, batch, reference, grn, receiptNo]
      .filter((v): v is string => !!v && v.length >= 3);

    if (needles.length === 0) return;

    let cancelled = false;
    const marked: HTMLElement[] = [];

    const attempt = (tries = 0) => {
      if (cancelled || tries > 8) return;
      const targets = findTargets(needles);
      if (targets.length === 0) {
        setTimeout(() => attempt(tries + 1), 400);
        return;
      }
      targets[0].scrollIntoView({ behavior: "smooth", block: "center" });
      targets.forEach((el) => {
        el.classList.add(...HIGHLIGHT_CLASSES);
        marked.push(el);
      });
      window.setTimeout(() => {
        marked.forEach((el) => el.classList.remove(...HIGHLIGHT_CLASSES));
      }, 6000);
    };

    // Wait a beat for the destination page to render its data
    const initial = window.setTimeout(() => attempt(0), 500);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      marked.forEach((el) => el.classList.remove(...HIGHLIGHT_CLASSES));
    };
  }, [searchParams, location.pathname]);

  return null;
};

export default GlobalHighlightBridge;