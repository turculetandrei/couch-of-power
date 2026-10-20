'use client';

import { Check } from 'lucide-react';
import { TEAM_COLORS, type TeamStyle } from '@/lib/room/types';
import { useT } from '@/lib/i18n/context';
import { cn } from '@/lib/cn';

export function TeamStyleEditor({
  value,
  onChange,
  disabled,
}: {
  value: [TeamStyle, TeamStyle];
  onChange: (v: [TeamStyle, TeamStyle]) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const set = (i: 0 | 1, patch: Partial<TeamStyle>) => {
    const next = [...value] as [TeamStyle, TeamStyle];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-4">
      {([0, 1] as const).map((i) => (
        <fieldset key={i} disabled={disabled} className="flex flex-col gap-2.5">
          <legend className="sr-only">{t.teamLabel(value[i].name || t.teamDefault[i])}</legend>
          <label className="flex h-12 items-center gap-3 rounded-full border-2 border-line bg-raised px-4 focus-within:border-line-strong">
            <span className="size-3 shrink-0 rounded-full" style={{ background: value[i].color }} aria-hidden />
            <span className="sr-only">{t.teamLabel('')}</span>
            <input
              value={value[i].name}
              placeholder={t.teamDefault[i]}
              maxLength={18}
              onChange={(e) => set(i, { name: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-2"
            />
          </label>
          <div className="flex gap-2 pl-1" role="radiogroup" aria-label={t.teamLabel(value[i].name || t.teamDefault[i])}>
            {TEAM_COLORS.map((c) => {
              const taken = value[1 - i].color === c;
              const selected = value[i].color === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c}
                  disabled={taken}
                  onClick={() => set(i, { color: c })}
                  className={cn(
                    'flex size-11 items-center justify-center rounded-full transition-transform disabled:opacity-20',
                    selected && 'ring-2 ring-fg ring-offset-2 ring-offset-surface',
                  )}
                >
                  <span className="flex size-8 items-center justify-center rounded-full" style={{ background: c }}>
                    {selected && <Check size={16} className="text-black" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
