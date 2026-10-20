'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { IconButton } from './button';

/**
 * Bottom sheet on phones, centred panel on larger screens.
 * Built on <dialog> for free focus trapping, Esc to close and top-layer stacking.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={cn(
        'sheet m-0 mt-auto w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-black/70',
        'md:m-auto md:max-w-lg',
        className,
      )}
    >
      <div className="flex max-h-[88dvh] flex-col rounded-t-panel border-2 border-b-0 border-line bg-surface md:max-h-[80dvh] md:rounded-panel md:border-b-2">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <h2 className="text-[20px] font-medium">{title}</h2>
          <IconButton label={t.close} onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{open && children}</div>
        {footer && <div className="safe-bottom border-t-2 border-line px-5 pt-3">{footer}</div>}
      </div>
    </dialog>
  );
}
