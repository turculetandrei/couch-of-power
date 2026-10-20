'use client';

import { Minus, Plus } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[16px]">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[13px] leading-snug text-fg-2">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors disabled:opacity-40',
          checked ? 'border-go bg-go' : 'border-line bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-fg shadow transition-[left]',
            checked ? 'left-[22px]' : 'left-[2px]',
          )}
        />
      </button>
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  hint,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[16px]">{label}</p>
        {hint && <p className="mt-0.5 text-[13px] text-fg-2">{hint}</p>}
      </div>
      <div className="flex items-center gap-1 rounded-full border-2 border-line p-0.5" role="group" aria-label={label}>
        <button
          type="button"
          aria-label="−1"
          disabled={disabled || value <= min}
          onClick={() => onChange(value - 1)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/5 disabled:opacity-30"
        >
          <Minus size={18} />
        </button>
        <output aria-live="polite" className="tabular w-7 text-center text-[18px] font-medium">
          {value}
        </output>
        <button
          type="button"
          aria-label="+1"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/5 disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

export function TextField({
  label,
  className,
  trailing,
  ...rest
}: { label: string; trailing?: ReactNode } & ComponentProps<'input'>) {
  return (
    <label className={cn('flex h-14 items-center gap-2 rounded-full border-2 border-line bg-raised pl-5 pr-1.5 focus-within:border-line-strong', className)}>
      <span className="sr-only">{label}</span>
      <input
        className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-3"
        placeholder={label}
        {...rest}
      />
      {trailing}
    </label>
  );
}

/** A section with the reference's hairline outline. */
export function Panel({ className, children, ...rest }: ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-panel border-2 border-line p-5', className)} {...rest}>
      {children}
    </section>
  );
}

export function Divider() {
  return <hr className="border-t-2 border-line" />;
}
