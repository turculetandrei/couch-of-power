'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/cn';

export function LangToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'ro' ? 'en' : 'ro')}
      aria-label={t.langLabel}
      className="flex h-11 min-w-11 items-center justify-center rounded-full border-2 border-line px-3 text-[13px] font-medium tracking-wide text-fg-2 hover:border-line-strong hover:text-fg"
    >
      {t.lang}
    </button>
  );
}

export function TopBar({
  back,
  onBack,
  title,
  right,
  className,
}: {
  back?: string;
  onBack?: () => void;
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const arrow = <ArrowLeft size={26} strokeWidth={2} />;
  const cls = 'flex size-11 items-center justify-center rounded-full hover:bg-white/5 -ml-2';
  return (
    <header className={cn('safe-top flex items-center gap-2 pb-2', className)}>
      {onBack ? (
        <button type="button" aria-label={t.back} onClick={onBack} className={cls}>
          {arrow}
        </button>
      ) : back ? (
        <Link href={back} aria-label={t.back} className={cls}>
          {arrow}
        </Link>
      ) : null}
      <div className="min-w-0 flex-1 truncate text-[17px] font-medium">{title}</div>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
