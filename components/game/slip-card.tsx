'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { vibrate } from '@/lib/storage';

/** Original line-art card back: concentric arches framing a tiny couch. */
export function CardBack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 168" className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="#2c2c2e" strokeWidth="1.6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${14 + i * 7} 168 V${70 + i * 4} a${46 - i * 7} ${46 - i * 7} 0 0 1 ${92 - i * 14} 0 V168`} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={`t${i}`} d={`M${14 + i * 7} 0 V${30 - i * 4} a${46 - i * 7} ${46 - i * 7} 0 0 0 ${92 - i * 14} 0 V0`} opacity="0.6" />
        ))}
        <circle cx="60" cy="84" r="22" />
        <circle cx="60" cy="84" r="15" />
      </g>
      {/* couch glyph */}
      <g fill="none" stroke="#5a5a5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M49 86v-6a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v6" />
        <path d="M46 84a2.5 2.5 0 0 1 5 0v4h18v-4a2.5 2.5 0 0 1 5 0v7a2 2 0 0 1-2 2H48a2 2 0 0 1-2-2z" />
        <path d="M49 93v3M71 93v3" />
      </g>
    </svg>
  );
}

/** White name slip, drawn like the reference's playing cards. */
export function SlipFace({
  name,
  caption,
  accent = 'var(--color-card-red)',
  className,
}: {
  name: string;
  caption?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full w-full flex-col justify-between overflow-hidden rounded-slip p-3 text-black',
        className,
      )}
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f1f1f4 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 12px 32px rgba(0,0,0,.55)',
      }}
    >
      {caption && <span className="text-[11px] font-medium tracking-wide text-black/45 uppercase">{caption}</span>}
      <span
        className="block text-[clamp(20px,7cqw,34px)] leading-[1.05] font-medium break-words"
        style={{ color: accent }}
      >
        {name}
      </span>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill={accent}>
        <path d="M5 13v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3h1a1.5 1.5 0 0 1 1.5 1.5V18a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-3.5A1.5 1.5 0 0 1 4 13z" />
      </svg>
    </div>
  );
}

/**
 * Press-and-hold to reveal. Releases on pointer up/leave/cancel, on Space/Enter keyup,
 * and immediately when the page is hidden or loses focus.
 */
export function useHoldReveal(onReveal?: () => void) {
  const [open, setOpen] = useState(false);
  const holding = useRef(false);

  const show = useCallback(() => {
    if (holding.current) return;
    holding.current = true;
    setOpen(true);
    vibrate(12);
    onReveal?.();
  }, [onReveal]);
  const hide = useCallback(() => {
    holding.current = false;
    setOpen(false);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hide();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', hide);
      window.removeEventListener('pagehide', hide);
    };
  }, [hide]);

  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      show();
    },
    onPointerUp: hide,
    onPointerCancel: hide,
    onLostPointerCapture: hide,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        show();
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') hide();
    },
    onBlur: hide,
  };
  return { open, bind };
}

export function SlipCard({
  name,
  caption,
  hint,
  srLabel,
  accent,
  className,
  onReveal,
}: {
  name: string | null;
  caption?: string;
  hint: string;
  srLabel: string;
  accent?: string;
  className?: string;
  onReveal?: () => void;
}) {
  const { open, bind } = useHoldReveal(onReveal);
  return (
    <button
      type="button"
      aria-label={srLabel}
      aria-pressed={open}
      disabled={!name}
      className={cn('flip secret relative touch-none rounded-slip [container-type:inline-size]', className)}
      data-open={open}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      {...bind}
    >
      <span className="flip-inner block">
        <span className="flip-face block overflow-hidden rounded-slip border-2 border-line bg-black">
          <CardBack className="h-full w-full" />
          <span className="absolute inset-x-0 bottom-3 px-2 text-center text-[12px] leading-tight text-fg-2">
            {hint}
          </span>
        </span>
        <span className="flip-face back-side block">
          {/* The name is only rendered while held, so it isn't sitting in the DOM. */}
          {open && name ? <SlipFace name={name} caption={caption} accent={accent} /> : <span className="block h-full w-full rounded-slip bg-card" />}
        </span>
      </span>
      {open && name && <span className="sr-only" aria-live="assertive">{name}</span>}
    </button>
  );
}
