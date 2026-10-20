'use client';

import { ClipboardPaste, History, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useT } from '@/lib/i18n/context';
import { cleanName } from '@/lib/room/reducer';
import { storage } from '@/lib/storage';

export const LAST_GROUP_KEY = 'cop:lastGroup';

/** Split pasted text on new lines, commas, semicolons or tabs. */
export function parseNames(text: string) {
  return text
    .split(/[\n,;\t]+/)
    .map((s) => cleanName(s.replace(/^\s*\d+[.)]\s*/, '')))
    .filter((s): s is string => !!s);
}

export function NamesStep({ names, onChange }: { names: string[]; onChange: (n: string[]) => void }) {
  const t = useT();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [last, setLast] = useState<string[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = storage.get<string[]>(LAST_GROUP_KEY);
    if (Array.isArray(saved) && saved.length) setLast(saved);
  }, []);

  function add(list: string[]) {
    const next = [...names];
    let dup: string | null = null;
    for (const n of list) {
      if (next.some((x) => x.toLocaleLowerCase('ro') === n.toLocaleLowerCase('ro'))) dup = n;
      else if (next.length < 20) next.push(n);
    }
    onChange(next);
    setError(dup ? t.setup.duplicate(dup) : null);
  }

  function commitDraft() {
    const parsed = parseNames(draft);
    if (parsed.length) add(parsed);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[32px] leading-tight font-light">{t.setup.namesTitle}</h1>
        <p className="mt-1 text-[15px] text-fg-2">{t.setup.namesHint}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          commitDraft();
          input.current?.focus();
        }}
        className="flex h-14 items-center gap-2 rounded-full border-2 border-line bg-raised pr-1.5 pl-5 focus-within:border-line-strong"
      >
        <label className="sr-only" htmlFor="name-input">
          {t.setup.namePlaceholder}
        </label>
        <input
          id="name-input"
          ref={input}
          value={draft}
          enterKeyHint="next"
          autoComplete="off"
          autoCapitalize="words"
          placeholder={t.setup.namePlaceholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,\n]/.test(v)) {
              add(parseNames(v));
              setDraft('');
            } else setDraft(v);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[\n,;]/.test(text)) {
              e.preventDefault();
              add(parseNames(text));
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-fg-3"
        />
        <button
          type="submit"
          aria-label={t.setup.add}
          disabled={!draft.trim()}
          className="flex size-11 items-center justify-center rounded-full bg-fg text-bg disabled:opacity-25"
        >
          <Plus size={22} />
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="line" icon={<ClipboardPaste size={16} />} onClick={() => setPasteOpen(true)}>
          {t.setup.paste}
        </Button>
        {last && names.length === 0 && (
          <Button size="sm" variant="line" icon={<History size={16} />} onClick={() => add(last)}>
            {t.setup.lastGroup(last.length)}
          </Button>
        )}
        {names.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onChange([])}>
            {t.setup.clearAll}
          </Button>
        )}
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-[14px] text-pot">
        {error}
      </p>

      <ul className="flex flex-wrap gap-2" aria-label={t.players}>
        {names.map((n) => (
          <li key={n} className="flex h-12 items-center gap-2 rounded-full bg-raised pr-1 pl-1.5">
            <Avatar seed={seedFromName(n)} size={36} />
            <span className="max-w-[12ch] truncate text-[15px]">{n}</span>
            <button
              type="button"
              aria-label={t.setup.remove(n)}
              onClick={() => onChange(names.filter((x) => x !== n))}
              className="flex size-10 items-center justify-center rounded-full text-fg-2 hover:bg-white/5 hover:text-fg"
            >
              <X size={18} />
            </button>
          </li>
        ))}
      </ul>

      <Sheet
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title={t.setup.paste}
        footer={
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!parseNames(pasteText).length}
            onClick={() => {
              add(parseNames(pasteText));
              setPasteText('');
              setPasteOpen(false);
            }}
          >
            {t.setup.pasteApply} {parseNames(pasteText).length ? `(${parseNames(pasteText).length})` : ''}
          </Button>
        }
      >
        <p className="mb-3 text-[14px] text-fg-2">{t.setup.pasteHint}</p>
        <textarea
          autoFocus
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={8}
          aria-label={t.setup.paste}
          placeholder={'Andrei\nMaria\nIoana\n…'}
          className="w-full rounded-tile border-2 border-line bg-raised p-4 text-[16px] outline-none placeholder:text-fg-3 focus:border-line-strong"
        />
      </Sheet>
    </div>
  );
}
