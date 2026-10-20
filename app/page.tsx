'use client';

import { ArrowRight, ChevronRight, Play, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Wordmark } from '@/components/ui/brand';
import { LangToggle } from '@/components/ui/top-bar';
import { SlipFace } from '@/components/game/slip-card';
import { useT } from '@/lib/i18n/context';

export default function Home() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState('');
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 md:px-8">
      <header className="safe-top flex items-center justify-between pb-2">
        <Wordmark />
        <LangToggle />
      </header>

      <section className="pt-10 pb-8 md:pt-16 md:pb-12">
        <p className="text-[15px] text-fg-2">{t.home.eyebrow}</p>
        <h1 className="mt-2 max-w-[14ch] text-[44px] leading-[1.02] font-light tracking-tight md:text-[72px]">
          {t.home.title}
        </h1>
      </section>

      {/* Mode carousel (peeks on phones, grid on desktop) */}
      <nav
        aria-label="Moduri"
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
      >
        <Link
          href="/local"
          className="group relative flex min-h-[300px] w-[84%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-panel p-6 text-black md:w-auto"
          style={{ background: 'linear-gradient(135deg, #DCE7F5 0%, #D6EFD8 100%)' }}
        >
          <div className="pointer-events-none absolute top-6 left-6 flex" aria-hidden>
            {['Maria', 'Andrei', 'Ioana'].map((n, i) => (
              <div
                key={n}
                className="h-[104px] w-[76px]"
                style={{ transform: `rotate(${(i - 1) * 9}deg) translateY(${i === 1 ? -6 : 0}px)`, marginLeft: i ? -22 : 0 }}
              >
                <SlipFace name={n} className="!p-2 [&>span]:!text-[15px]" />
              </div>
            ))}
          </div>
          <h2 className="text-[28px] leading-tight font-normal">{t.home.modeLocal}</h2>
          <p className="mt-2 max-w-[30ch] text-[15px] text-black/60">{t.home.modeLocalSub}</p>
          <ArrowRight className="absolute right-6 bottom-6 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>

        <Link
          href="/online"
          className="group relative flex min-h-[300px] w-[84%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-panel border-2 border-line p-6 hover:border-line-strong md:w-auto"
        >
          <div className="pointer-events-none absolute top-6 left-6 flex items-center" aria-hidden>
            {[11, 23, 37, 58, 71].map((s, i) => (
              <div key={s} className="-ml-2 first:ml-0" style={{ opacity: i === 2 ? 1 : 0.45 }}>
                <Avatar seed={s} size={i === 2 ? 56 : 44} />
              </div>
            ))}
            <span className="ml-3 flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[13px] text-go">
              <Wifi size={14} /> live
            </span>
          </div>
          <h2 className="text-[28px] leading-tight font-normal">{t.home.modeOnline}</h2>
          <p className="mt-2 max-w-[30ch] text-[15px] text-fg-2">{t.home.modeOnlineSub}</p>
          <ArrowRight className="absolute right-6 bottom-6 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>

        <Link
          href="/tutorial"
          className="group relative flex min-h-[300px] w-[84%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-panel border-2 border-line p-6 hover:border-line-strong md:w-auto"
        >
          <span className="absolute top-6 left-6 flex size-14 items-center justify-center rounded-full border-[2.5px] border-fg" aria-hidden>
            <Play size={22} className="ml-0.5" fill="currentColor" />
          </span>
          <h2 className="text-[28px] leading-tight font-normal">{t.home.modeTutorial}</h2>
          <p className="mt-2 max-w-[30ch] text-[15px] text-fg-2">{t.home.modeTutorialSub}</p>
          <ArrowRight className="absolute right-6 bottom-6 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-8 md:mt-12 md:grid-cols-2 md:gap-12">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (clean.length === 5) router.push(`/r/${clean}`);
          }}
        >
          <h2 className="text-[20px] font-medium">{t.home.joinTitle}</h2>
          <label className="flex h-16 items-center gap-2 rounded-full border-2 border-line bg-raised pr-2 pl-6 focus-within:border-line-strong">
            <span className="sr-only">{t.home.joinPlaceholder}</span>
            <input
              value={clean}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t.home.joinPlaceholder}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              className="tabular h-full min-w-0 flex-1 bg-transparent text-[22px] tracking-[0.3em] uppercase outline-none placeholder:tracking-normal placeholder:text-fg-3"
            />
            <button
              type="submit"
              disabled={clean.length !== 5}
              className="flex h-12 items-center gap-1 rounded-full bg-fg px-5 text-[15px] font-medium text-bg disabled:opacity-30"
            >
              {t.home.joinCta}
              <ChevronRight size={18} />
            </button>
          </label>
        </form>

        <section>
          <h2 className="text-[20px] font-medium">{t.home.rulesTitle}</h2>
          <ol className="mt-3 flex flex-col">
            {t.home.rules.map((r, i) => (
              <li key={i} className="flex gap-4 border-b-2 border-line py-3 last:border-0">
                <span className="tabular w-5 shrink-0 text-[17px] font-light text-pot">{i + 1}</span>
                <span className="text-[15px] leading-snug text-fg-2">{r}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <footer className="safe-bottom mt-auto pt-12 text-[13px] text-fg-3">{t.tagline}</footer>
    </main>
  );
}
