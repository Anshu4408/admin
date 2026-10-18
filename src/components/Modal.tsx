import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
interface ModalProps {
  isOpen: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'md' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [isOpen]);
  if (!isOpen) return null;
  const widths = { sm:'max-w-sm', md:'max-w-md', lg:'max-w-lg', xl:'max-w-xl', '2xl':'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined} className={`admin-dialog flex min-w-0 max-h-[calc(100dvh-1.5rem)] w-full ${widths[maxWidth]} flex-col rounded-xl border border-neutral-700 bg-neutral-900 outline-none sm:max-h-[calc(100dvh-3rem)]`}>
        <div className="max-h-[40dvh] overflow-y-auto flex shrink-0 items-start justify-between gap-3 border-b border-neutral-800 p-4 sm:p-5">
          <div className="min-w-0"><h2 id={titleId} className="break-words [overflow-wrap:anywhere] text-base font-medium text-neutral-100">{title}</h2>{subtitle && <p id={descriptionId} className="mt-1 break-words text-xs leading-relaxed text-neutral-400">{subtitle}</p>}</div>
          <button onClick={onClose} aria-label="Close dialog" className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="dialog-content min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
