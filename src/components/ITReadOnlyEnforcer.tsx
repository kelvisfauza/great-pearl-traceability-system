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

// Substrings on buttons/links we should ALWAYS allow (nav, filters, print,
// exports, search UI, etc.).
const ALLOW_KEYWORDS = [
  'search', 'filter', 'export', 'download', 'print', 'view', 'open',
  'refresh', 'reload', 'close', 'cancel', 'back', 'next', 'previous',
  'expand', 'collapse', 'copy', 'share',
];

function shouldBlock(el: HTMLElement): boolean {
  // Respect explicit opt-outs
  if (el.closest('[data-it-allow="true"]')) return false;
  // Allow anything inside the sidebar / global nav / dialogs' close controls
  if (el.closest('[data-sidebar]')) return false;
  if (el.closest('[role="navigation"]')) return false;

  const label = (el.getAttribute('aria-label') || el.textContent || '')
    .trim()
    .toLowerCase();
  if (!label) return false;

  if (ALLOW_KEYWORDS.some((k) => label.includes(k))) return false;
  return MUTATE_KEYWORDS.some((k) => {
    // word-boundary-ish match
    const re = new RegExp(`(^|[^a-z])${k}([^a-z]|$)`, 'i');
    return re.test(label);
  });
}

/**
 * Globally intercepts mutating clicks on read-only routes for IT Officers.
 * Also disables form submissions on those pages.
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
      if (shouldBlock(el)) {
        e.preventDefault();
        e.stopPropagation();
        toast.warning('Read-only for IT Officers — request an Administrator to make this change.', {
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

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [readOnly]);

  return null;
}

export default ITReadOnlyEnforcer;