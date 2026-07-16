import { useEffect } from 'react';
import { toast } from 'sonner';
import { useITReadOnly } from '@/hooks/useITReadOnly';

// Keywords on buttons/links that indicate a mutating action.
const MUTATE_KEYWORDS = [
  'add', 'new', 'create', 'edit', 'delete', 'remove', 'save', 'update',
  'submit', 'approve', 'reject', 'decline', 'issue', 'process', 'pay',
  'record', 'register', 'upload', 'import', 'assign', 'transfer', 'send',
  'freeze', 'unfreeze', 'lock', 'unlock', 'reset', 'generate', 'confirm',
];

// Substrings on buttons/links that must be BLOCKED for IT Officers — they
// cannot print, export, download, share, or copy data out of the system.
const OUTPUT_KEYWORDS = [
  'print', 'export', 'download', 'share', 'copy', 'save as', 'save pdf',
  'save excel', 'save csv', 'pdf', 'excel', 'csv', 'email pdf', 'send pdf',
];

// Substrings on buttons/links we should ALWAYS allow (nav, filters, search).
const ALLOW_KEYWORDS = [
  'search', 'filter', 'view', 'open',
  'refresh', 'reload', 'close', 'cancel', 'back', 'next', 'previous',
  'expand', 'collapse',
];

function labelOf(el: HTMLElement): string {
  return (el.getAttribute('aria-label') || el.textContent || '')
    .trim()
    .toLowerCase();
}

function isOutputAction(label: string): boolean {
  return OUTPUT_KEYWORDS.some((k) => label.includes(k));
}

function shouldBlock(el: HTMLElement): { block: boolean; reason: 'mutate' | 'output' | null } {
  // Respect explicit opt-outs
  if (el.closest('[data-it-allow="true"]')) return { block: false, reason: null };
  // Allow anything inside the sidebar / global nav / dialogs' close controls
  if (el.closest('[data-sidebar]')) return { block: false, reason: null };
  if (el.closest('[role="navigation"]')) return { block: false, reason: null };

  const label = labelOf(el);
  if (!label) return { block: false, reason: null };

  // Output actions (print/export/download/share/copy) are always blocked,
  // even if the label also matches an allow keyword.
  if (isOutputAction(label)) return { block: true, reason: 'output' };

  if (ALLOW_KEYWORDS.some((k) => label.includes(k))) return { block: false, reason: null };
  const mutates = MUTATE_KEYWORDS.some((k) => {
    // word-boundary-ish match
    const re = new RegExp(`(^|[^a-z])${k}([^a-z]|$)`, 'i');
    return re.test(label);
  });
  return { block: mutates, reason: mutates ? 'mutate' : null };
}

/**
 * Globally intercepts mutating clicks on read-only routes for IT Officers.
 * Also blocks print, export, download, share and copy actions, disables form
 * submissions, and intercepts native print + share flows.
 */
export function ITReadOnlyEnforcer() {
  const readOnly = useITReadOnly();

  useEffect(() => {
    if (!readOnly) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(
        'button, a[role="button"], [role="menuitem"], input[type="submit"], input[type="button"]'
      ) as HTMLElement | null;
      if (!el) return;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
      const { block, reason } = shouldBlock(el);
      if (block) {
        e.preventDefault();
        e.stopPropagation();
        const msg =
          reason === 'output'
            ? 'IT Officers cannot print, export, download or share data from the system.'
            : 'Read-only for IT Officers — request an Administrator to make this change.';
        toast.warning(msg, {
          position: 'top-center',
          duration: 3500,
        });
      }
    };

    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLElement | null;
      if (!form) return;
      if (form.closest('[data-it-allow="true"]')) return;
      e.preventDefault();
      e.stopPropagation();
      toast.warning('Read-only for IT Officers — this form cannot be submitted.', {
        position: 'top-center',
        duration: 3500,
      });
    };

    // Block Ctrl/Cmd+P (print) and Ctrl/Cmd+S (save page)
    const onKeydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning('IT Officers cannot print or save documents from the system.', {
          position: 'top-center',
          duration: 3500,
        });
      }
    };

    // Intercept programmatic window.print()
    const originalPrint = window.print;
    window.print = () => {
      toast.warning('IT Officers cannot print documents from the system.', {
        position: 'top-center',
        duration: 3500,
      });
    };

    // Intercept navigator.share()
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    const originalShare = nav.share ? nav.share.bind(nav) : undefined;
    if (originalShare) {
      nav.share = () => {
        toast.warning('IT Officers cannot share data from the system.', {
          position: 'top-center',
          duration: 3500,
        });
        return Promise.reject(new Error('Sharing disabled for IT Officers.'));
      };
    }

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKeydown, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('keydown', onKeydown, true);
      window.print = originalPrint;
      if (originalShare) nav.share = originalShare;
    };
  }, [readOnly]);

  return null;
}

export default ITReadOnlyEnforcer;