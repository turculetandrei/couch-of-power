'use client';

import { ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LangToggle, TopBar } from '@/components/ui/top-bar';
import { ApiError, NICK_KEY, api, sessions } from '@/lib/client/api';
import { useT } from '@/lib/i18n/context';
import { storage } from '@/lib/storage';

export default function OnlinePage() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nick = storage.get<string>(NICK_KEY);
    if (nick) setName(nick);
  }, []);

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  const trimmed = name.trim();

  async function create() {
    if (!trimmed) return setError(t.online.badName);
    setBusy(true);
    setError(null);
    try {
      storage.set(NICK_KEY, trimmed);
      const res = await api.create(trimmed);
      sessions.set(res.code, { token: res.token, playerId: res.playerId });
      router.push(`/r/${res.code}`);
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'network' ? t.errors.network : t.online.error);
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <TopBar back="/" title={<span className="text-[15px] font-normal text-fg-2">{t.online.title}</span>} right={<LangToggle />} />

      <section className="flex flex-col items-center gap-4 pt-8 pb-6 text-center">
        <Avatar seed={seedFromName(trimmed || '?')} size={112} />
        <h1 className="text-[32px] leading-tight font-light">{t.online.yourName}</h1>
      </section>

      <label className="flex h-16 items-center rounded-full border-2 border-line bg-raised px-6 focus-within:border-line-strong">
        <span className="sr-only">{t.online.yourName}</span>
        <input
          value={name}
          maxLength={18}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          placeholder={t.setup.namePlaceholder}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          className="h-full w-full bg-transparent text-center text-[22px] outline-none placeholder:text-fg-3"
        />
      </label>

      <p role="alert" className="min-h-6 pt-2 text-center text-[14px] text-danger">
        {error}
      </p>

      <div className="mt-2 flex flex-col gap-3">
        <Button variant="primary" size="lg" block disabled={busy || !trimmed} onClick={create} icon={<Plus size={20} />}>
          {busy ? t.online.creating : t.online.create}
        </Button>
      </div>

      <div className="my-8 flex items-center gap-3 text-[13px] text-fg-3" aria-hidden>
        <span className="h-0.5 flex-1 bg-line" />
        {t.home.joinTitle}
        <span className="h-0.5 flex-1 bg-line" />
      </div>

      <form
        className="safe-bottom flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (cleanCode.length !== 5) return;
          if (trimmed) storage.set(NICK_KEY, trimmed);
          router.push(`/r/${cleanCode}`);
        }}
      >
        <label className="flex h-16 items-center gap-2 rounded-full border-2 border-line pr-2 pl-6 focus-within:border-line-strong">
          <span className="sr-only">{t.home.joinPlaceholder}</span>
          <input
            value={cleanCode}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.home.joinPlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="tabular h-full min-w-0 flex-1 bg-transparent text-[22px] tracking-[0.3em] uppercase outline-none placeholder:tracking-normal placeholder:normal-case placeholder:text-fg-3"
          />
          <button
            type="submit"
            disabled={cleanCode.length !== 5}
            aria-label={t.online.join}
            className="flex h-12 items-center gap-1.5 rounded-full border-[2.5px] border-fg px-5 text-[15px] font-medium disabled:opacity-30"
          >
            {t.home.joinCta}
            <ArrowRight size={18} />
          </button>
        </label>
      </form>
    </main>
  );
}
