import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTraineeMode } from '@/hooks/useTraineeMode';

/**
 * Global guard for Trainee (intern) accounts.
 * Active on EVERY route: blocks mutating actions, typing into fields,
 * uploads, printing, exporting, sharing and copying. Navigation, tabs,
 * search/filter boxes, pagination and viewing remain usable.
 */

const MUTATE_KEYWORDS = [
  'add', 'new', 'create', 'edit', 'delete', 'remove', 'save', 'update',
  'submit', 'approve', 'reject', 'decline', 'issue', 'process', 'pay',
  'record', 'register', 'upload', 'import', 'assign', 'transfer', 'send',
  'freeze', 'unfreeze', 'lock', 'unlock', 'reset', 'generate', 'confirm',
  'release', 'allocate', 'attach', 'scan', 'claim', 'withdraw', 'deposit',
  'invest', 'request', 'apply', 'mark', 'clear', 'complete', 'dispatch',
  'receive', 'sign', 'verify', 'award', 'charge', 'cancel request', 'resend',
  'archive', 'restore', 'sync', 'rebuild', 'migrate', 'give', 'grant', 'revoke',
];

const OUTPUT_KEYWORDS = [
  'print', 'export', 'download', 'share', 'copy', 'save as', 'pdf', 'excel', 'csv', 'docx',
];

const ALLOW_KEYWORDS = [
  'search', 'filter', 'view', 'open', 'refresh', 'reload', 'close', 'cancel',
  'back', 'next', 'previous', 'prev', 'expand', 'collapse', 'details', 'show',
  'hide', 'sort', 'page', 'load more', 'menu', 'toggle', 'training', 'skip',
  'finish', 'got it', 'dismiss', 'ok', 'sign out', 'log out', 'logout', 'theme',
];

function labelOf(el: HTMLElement): string {
  return (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
    .trim()
    .toLowerCase();
}

function isAllowedContext(el: HTMLElement): boolean {
  return Boolean(
    el.closest('[data-trainee-allow="true"], [data-trainee-ui], [data-sidebar], [role="navigation"], [role="tablist"], [role="tab"], [role="listbox"], [role="option"], [role="combobox"], [cmdk-root], [data-radix-select-viewport], .pagination, nav')
  );
}

function isSearchField(el: HTMLElement): boolean {
  const input = el as HTMLInputElement;
  const type = (input.type || '').toLowerCase();
  if (type === 'search') return true;
  const hint = [
    input.placeholder,
    input.getAttribute('aria-label'),
    input.name,
    input.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /search|filter|find|look ?up|from|to|date|month|year|period|range/.test(hint);
}

function classifyButton(el: HTMLElement): 'mutate' | 'output' | null {
  if (isAllowedContext(el)) return null;
  const label = labelOf(el);
  if (!label) {
    // Icon-only buttons: block when they submit a form; allow the rest.
    return (el as HTMLButtonElement).type === 'submit' ? 'mutate' : null;
  }
  if (OUTPUT_KEYWORDS.some((k) => label.includes(k))) return 'output';
  if (ALLOW_KEYWORDS.some((k) => label.includes(k))) return null;
  if ((el as HTMLButtonElement).type === 'submit') return 'mutate';
  const mutates = MUTATE_KEYWORDS.some((k) => {
    const re = new RegExp(`(^|[^a-z])${k.replace(/\s+/g, '\\s+')}([^a-z]|$)`, 'i');
    return re.test(label);
  });
  return mutates ? 'mutate' : null;
}

export function TraineeEnforcer() {
  const trainee = useTraineeMode();
  const lastToast = useRef(0);

  useEffect(() => {
    if (!trainee) return;

    const warn = (msg: string) => {
      const now = Date.now();
      if (now - lastToast.current < 1500) return;
      lastToast.current = now;
      toast.warning(msg, { position: 'top-center', duration: 3000 });
    };
    const VIEW_ONLY = 'Training account is view-only — you can look, but not change anything.';
    const NO_OUTPUT = 'Training accounts cannot print, export, download or share data.';

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Toggles, checkboxes, switches, radios and file pickers are edits.
      const toggle = target.closest(
        'input[type="checkbox"], input[type="radio"], input[type="file"], [role="checkbox"], [role="switch"], [role="radio"], [role="menuitemcheckbox"], [role="menuitemradio"]'
      ) as HTMLElement | null;
      if (toggle && !isAllowedContext(toggle)) {
        e.preventDefault();
        e.stopPropagation();
        warn(VIEW_ONLY);
        return;
      }

      const el = target.closest(
        'button, a[role="button"], [role="menuitem"], input[type="submit"], input[type="button"], label[for]'
      ) as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;

      // Download links
      const anchor = target.closest('a[download], a[href^="blob:"], a[href$=".pdf"], a[href$=".xlsx"], a[href$=".csv"]');
      if (anchor && !isAllowedContext(anchor as HTMLElement)) {
        e.preventDefault();
        e.stopPropagation();
        warn(NO_OUTPUT);
        return;
      }

      const reason = classifyButton(el);
      if (reason) {
        e.preventDefault();
        e.stopPropagation();
        warn(reason === 'output' ? NO_OUTPUT : VIEW_ONLY);
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLElement | null;
      if (form?.closest('[data-trainee-allow="true"], [data-trainee-ui]')) return;
      e.preventDefault();
      e.stopPropagation();
      warn('Training account is view-only — forms cannot be submitted.');
    };

    const onBeforeInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const field = t.closest('input, textarea, [contenteditable="true"]') as HTMLElement | null;
      if (!field) return;
      if (field.closest('[data-trainee-allow="true"], [data-trainee-ui], [cmdk-root]')) return;
      if (field.tagName === 'INPUT' && isSearchField(field)) return;
      e.preventDefault();
      e.stopPropagation();
      warn('Training account is view-only — data entry is disabled.');
    };

    const onCopy = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[data-trainee-allow="true"], [data-trainee-ui]')) return;
      e.preventDefault();
      warn(NO_OUTPUT);
    };

    const onKeydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        warn(NO_OUTPUT);
      }
    };

    const originalPrint = window.print;
    window.print = () => warn(NO_OUTPUT);

    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    const originalShare = nav.share ? nav.share.bind(nav) : undefined;
    if (originalShare) {
      nav.share = () => {
        warn(NO_OUTPUT);
        return Promise.reject(new Error('Sharing disabled for training accounts.'));
      };
    }

    // Block programmatic file downloads (blob URLs used by PDF/Excel generators)
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = ((obj: Blob | MediaSource) => {
      if (obj instanceof Blob && !(obj as File).name && obj.type && !obj.type.startsWith('image/')) {
        warn(NO_OUTPUT);
        return '';
      }
      return originalCreateObjectURL.call(URL, obj);
    }) as typeof URL.createObjectURL;

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('beforeinput', onBeforeInput, true);
    document.addEventListener('paste', onBeforeInput, true);
    document.addEventListener('drop', onBeforeInput, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', onCopy, true);
    document.addEventListener('keydown', onKeydown, true);
    document.documentElement.setAttribute('data-trainee', 'true');

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('beforeinput', onBeforeInput, true);
      document.removeEventListener('paste', onBeforeInput, true);
      document.removeEventListener('drop', onBeforeInput, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', onCopy, true);
      document.removeEventListener('keydown', onKeydown, true);
      document.documentElement.removeAttribute('data-trainee');
      window.print = originalPrint;
      URL.createObjectURL = originalCreateObjectURL;
      if (originalShare) nav.share = originalShare;
    };
  }, [trainee]);

  return null;
}

export default TraineeEnforcer;
