/**
 * Global print interception.
 *
 * Every print in the system (new-window prints, hidden-iframe prints and
 * direct window.print() calls) is routed through a small dialog that lets
 * the user either print immediately or push the document into their
 * cross-device print queue.
 */

export const PRINT_INTENT_EVENT = 'print-intent';

export type PrintIntent = {
  title: string;
  html: string | null;
  /** the window that requested the print (top window or a child/iframe window) */
  win: Window;
  /** print straight away (original behaviour) */
  now: () => void;
  /** store in the print queue instead */
  queue: () => void;
  /** do nothing */
  cancel: () => void;
  /** close the temporary print window/iframe (used after queue/cancel) */
  dismiss: () => void;
};

/** Set to true around prints that must never be intercepted (the queue itself). */
export function bypassPrint<T>(fn: () => T): T {
  (window as any).__pqBypass = true;
  try {
    return fn();
  } finally {
    setTimeout(() => { (window as any).__pqBypass = false; }, 3000);
  }
}

const isBypassed = () => Boolean((window as any).__pqBypass);

const grabHtml = (win: Window): string | null => {
  try {
    const doc = win.document;
    if (!doc || !doc.documentElement) return null;
    const html = doc.documentElement.outerHTML;
    return html && html.length > 40 ? html : null;
  } catch {
    return null;
  }
};

const grabTitle = (win: Window): string => {
  try {
    return win.document.title || document.title || 'Document';
  } catch {
    return 'Document';
  }
};

/**
 * Print captured HTML from a brand new window. Used because many callers do
 * `w.print(); w.close();` — by the time the user picks "Print now" the original
 * window/iframe is already gone (or focus-trapped), so printing it silently fails.
 */
function printHtmlInFreshWindow(html: string, title: string) {
  (window as any).__pqBypass = true;
  try {
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      (window as any).__pqBypass = false;
      return false;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    try { w.document.title = title; } catch { /* ignore */ }
    const fire = () => {
      try { w.focus(); } catch { /* ignore */ }
      try { w.print(); } catch { /* ignore */ }
      setTimeout(() => { try { w.close(); } catch { /* ignore */ } }, 800);
      setTimeout(() => { (window as any).__pqBypass = false; }, 1500);
    };
    // give images/styles a moment
    setTimeout(fire, 350);
    return true;
  } catch {
    (window as any).__pqBypass = false;
    return false;
  }
}

function ask(win: Window, originalPrint: () => void) {
  const html = grabHtml(win);
  const title = grabTitle(win);

  // Nothing capturable (PDF viewers, cross-origin) -> just print.
  if (!html) {
    originalPrint();
    return;
  }

  const isChild = win !== window;

  const detail: PrintIntent = {
    title,
    html,
    win,
    now: () => {
      if (isChild) {
        // Original child window is usually closed by the caller already.
        if (printHtmlInFreshWindow(html, title)) return;
      }
      // Focus the target window first — a print() fired while a modal in the
      // opener still holds focus is silently dropped by Chrome/Edge.
      try { win.focus(); } catch { /* ignore */ }
      try {
        originalPrint();
      } catch {
        try { (win as any).print?.(); } catch { /* ignore */ }
      }
    },
    queue: () => { /* handled by the dialog via printQueue */ },
    cancel: () => { /* no-op */ },
    dismiss: () => {
      try { if (win !== window) win.close(); } catch { /* ignore */ }
    },
  };

  const notPrevented = window.dispatchEvent(
    new CustomEvent<PrintIntent>(PRINT_INTENT_EVENT, { detail, cancelable: true })
  );
  // No dialog mounted -> keep the original behaviour.
  if (notPrevented) originalPrint();
}


function patchWindow(win: Window | null) {
  if (!win) return;
  try {
    const w = win as any;
    if (w.__pqPatched) return;
    const original = win.print?.bind(win);
    if (!original) return;
    w.__pqPatched = true;
    w.print = () => {
      if (isBypassed()) return original();
      ask(win, original);
    };
  } catch {
    /* cross-origin */
  }
}

let installed = false;

export function installPrintInterceptor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // 1. Top-level window.print()
  patchWindow(window);

  // 2. window.open(...) — patch the child as soon as it exists.
  const nativeOpen = window.open.bind(window);
  window.open = ((...args: any[]) => {
    const child = nativeOpen(...(args as [any, any, any]));
    if (child) {
      patchWindow(child);
      // doc.write happens after open; re-patch shortly after in case the
      // document swap replaced the print binding.
      setTimeout(() => patchWindow(child), 50);
      setTimeout(() => patchWindow(child), 300);
    }
    return child;
  }) as typeof window.open;

  // 3. Hidden iframes used by in-place print helpers.
  const patchIframe = (el: HTMLIFrameElement) => {
    const tryPatch = () => patchWindow(el.contentWindow);
    tryPatch();
    el.addEventListener('load', tryPatch);
    setTimeout(tryPatch, 50);
    setTimeout(tryPatch, 400);
  };

  document.querySelectorAll('iframe').forEach(f => patchIframe(f as HTMLIFrameElement));

  const observer = new MutationObserver(muts => {
    muts.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node instanceof HTMLIFrameElement) patchIframe(node);
        else if (node instanceof HTMLElement) {
          node.querySelectorAll?.('iframe').forEach(f => patchIframe(f as HTMLIFrameElement));
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
