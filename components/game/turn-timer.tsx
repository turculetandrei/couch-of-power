'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { vibrate } from '@/lib/storage';

const PRESETS = [30, 45, 60, 90];

/** The reference's green countdown pie, as a simple turn timer. */
export function TurnTimer() {
  const t = useT();
  const [total, setTotal] = useState(45);
  const [left, setLeft] = useState(45);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    endAt.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        vibrate([80, 60, 80]);
      }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const frac = left / total;
  const R = 22;
  const C = 2 * Math.PI * R;
  const up = left === 0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-tile border-2 border-line p-3 pr-4">
      <div className="relative size-14 shrink-0" role="timer" aria-live={up ? 'assertive' : 'off'} aria-label={up ? t.seating.timerUp : `${left}s`}>
        <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--color-line)" strokeWidth="5" />
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={up ? 'var(--color-danger)' : 'var(--color-go)'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 200ms linear' }}
          />
        </svg>
        <span className={cn('tabular absolute inset-0 flex items-center justify-center text-[17px] font-medium', up && 'text-danger')}>
          {left}
        </span>
      </div>
      <p className="min-w-0 flex-1 text-[15px] font-medium">{up ? t.seating.timerUp : t.seating.timer}</p>
        <div className="order-last flex w-full gap-1 [&>button]:flex-1" role="radiogroup" aria-label={t.seating.timer}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={p === total}
              onClick={() => {
                setRunning(false);
                setTotal(p);
                setLeft(p);
              }}
              className={cn(
                'tabular h-8 min-w-11 rounded-full px-2 text-[13px]',
                p === total ? 'bg-fg text-bg' : 'bg-raised text-fg-2 hover:text-fg',
              )}
            >
              {p}s
            </button>
          ))}
        </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            if (left === 0) setLeft(total);
            setRunning((r) => !r);
          }}
          aria-label={running ? 'Pause' : t.seating.timerStart}
          className="flex size-11 items-center justify-center rounded-full bg-go text-go-ink"
        >
          {running ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setLeft(total);
          }}
          aria-label={t.seating.timerReset}
          className="flex size-11 items-center justify-center rounded-full border-2 border-line hover:border-line-strong"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
