import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'line' | 'go' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 font-medium select-none whitespace-nowrap ' +
  'transition-[background-color,border-color,color,opacity,transform] duration-150 ' +
  'active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100';

const variants: Record<Variant, string> = {
  // White fill: the one main action per screen.
  primary: 'bg-fg text-bg hover:bg-white',
  // "ADD FRIENDS" style: thick white outline on black.
  outline: 'border-[2.5px] border-fg text-fg hover:bg-white/5',
  // Hairline outline: secondary.
  line: 'border-2 border-line text-fg hover:border-line-strong',
  // Your turn.
  go: 'bg-go text-go-ink hover:brightness-110',
  ghost: 'text-fg-2 hover:text-fg hover:bg-white/5',
  danger: 'border-2 border-danger/50 text-danger hover:bg-danger/10',
};

const sizes: Record<Size, string> = {
  lg: 'h-14 px-6 rounded-full text-[17px]',
  md: 'h-12 px-5 rounded-full text-[15px]',
  sm: 'h-11 px-4 rounded-full text-[14px]',
};

interface Common {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'line',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: Common & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'line',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], block && 'w-full', className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** 44×44 round icon button, optionally outlined. */
export function IconButton({
  label,
  outlined,
  className,
  children,
  ...rest
}: { label: string; outlined?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-colors',
        outlined ? 'border-2 border-line hover:border-line-strong' : 'hover:bg-white/5',
        'disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
