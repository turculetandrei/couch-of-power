'use client';

import { ArrowLeftRight, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { LogEntry, PlayerId, Team } from '@/lib/game';
import type { PublicPlayer } from '@/lib/room/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { storage } from '@/lib/storage';

/* ------------------------------------------------------------ name picker */

export function NamePicker({
  open,
  onClose,
  players,
  mySlip,
  onCall,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  players: PublicPlayer[];
  mySlip: PlayerId | null;
  onCall: (id: PlayerId) => void;
  busy: boolean;
}) {
  const t = useT();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<PlayerId | null>(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setSel(null);
    }
  }, [open]);

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    return [...players]
      .sort((a, b) => a.name.localeCompare(b.name, 'ro'))
      .filter((p) => norm(p.name).includes(norm(q)));
  }, [players, q]);
  const selected = players.find((p) => p.id === sel);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.game.callTitle}
      footer={
        <Button
          variant="go"
          size="lg"
          block
          disabled={!selected || busy}
          onClick={() => selected && onCall(selected.id)}
        >
          {busy ? t.game.sending : selected ? t.game.callCta(selected.name) : t.game.callName}
        </Button>
      }
    >
      {players.length > 8 && (
        <label className="mb-3 flex h-12 items-center gap-2 rounded-full border-2 border-line bg-raised px-4 focus-within:border-line-strong">
          <Search size={18} className="text-fg-2" aria-hidden />
          <span className="sr-only">{t.game.callSearch}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.game.callSearch}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-3"
          />
        </label>
      )}
      <ul className="grid grid-cols-2 gap-2" role="listbox" aria-label={t.game.callTitle}>
        {list.map((p) => {
          const own = p.id === mySlip;
          const isSel = p.id === sel;
          return (
            <li key={p.id} role="option" aria-selected={isSel} aria-disabled={own}>
              <button
                type="button"
                disabled={own}
                onClick={() => (isSel ? onCall(p.id) : setSel(p.id))}
                className={cn(
                  'flex h-16 w-full items-center gap-2.5 rounded-tile border-2 pr-3 pl-2 text-left transition-colors',
                  isSel ? 'border-go bg-go/10' : 'border-line hover:border-line-strong',
                  own && 'opacity-35',
                )}
              >
                <Avatar seed={p.avatar} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px]">{p.name}</span>
                  {own && <span className="block text-[12px] text-fg-2">{t.game.ownSlip}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/* -------------------------------------------------------------- event log */

export function EventLog({
  log,
  names,
  className,
}: {
  log: LogEntry[];
  names: Record<PlayerId, string>;
  className?: string;
}) {
  const t = useT();
  if (!log.length) return <p className={cn('text-[14px] leading-snug text-fg-2', className)}>{t.game.logEmpty}</p>;
  return (
    <ol className={cn('flex flex-col', className)} aria-label={t.game.log}>
      {[...log].reverse().map((e) => (
        <li key={e.turn} className="flex gap-3 border-b-2 border-line py-3 last:border-0">
          <span className="tabular w-6 shrink-0 pt-0.5 text-right text-[14px] font-light text-pot">{e.turn}</span>
          <span className="min-w-0 text-[14px] leading-snug">
            <span className="block">{t.game.called(names[e.callerId] ?? '?', names[e.calledId] ?? '?')}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-fg-2">
              → {t.game.moved(names[e.moverId] ?? '?')}
              {e.swapped && (
                <span className="inline-flex items-center gap-1 text-fg-3">
                  · <ArrowLeftRight size={12} aria-hidden /> {t.game.swapped}
                </span>
              )}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ notes */

interface NotesData {
  guesses: Record<PlayerId, PlayerId | ''>;
  text: string;
}

/** Private memory aid. Lives in localStorage only, never sent anywhere. */
export function Notes({
  storageKey,
  players,
  meId,
}: {
  storageKey: string;
  players: PublicPlayer[];
  meId: PlayerId;
}) {
  const t = useT();
  const [data, setData] = useState<NotesData>({ guesses: {}, text: '' });
  useEffect(() => {
    setData(storage.get<NotesData>(storageKey) ?? { guesses: {}, text: '' });
  }, [storageKey]);
  const save = (d: NotesData) => {
    setData(d);
    storage.set(storageKey, d);
  };
  const others = players.filter((p) => p.id !== meId);
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, 'ro'));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-fg-2">{t.game.notesHint}</p>
      <ul className="flex flex-col gap-1.5">
        {others.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-full bg-raised py-1 pr-1 pl-1.5">
            <Avatar seed={p.avatar} size={32} />
            <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
            <label className="sr-only" htmlFor={`g-${p.id}`}>
              {`${p.name}: ${t.game.notesGuess}`}
            </label>
            <select
              id={`g-${p.id}`}
              value={data.guesses[p.id] ?? ''}
              onChange={(e) => save({ ...data, guesses: { ...data.guesses, [p.id]: e.target.value } })}
              className={cn(
                'h-10 max-w-[48%] rounded-full border-2 border-line bg-surface px-3 text-[14px] outline-none',
                data.guesses[p.id] ? 'text-pot' : 'text-fg-3',
              )}
            >
              <option value="">{t.game.notesGuess} {t.game.notesUnknown}</option>
              {sorted.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1.5 text-[13px] text-fg-2">
        {t.game.notesFree}
        <textarea
          rows={3}
          value={data.text}
          onChange={(e) => save({ ...data, text: e.target.value })}
          className="rounded-tile border-2 border-line bg-raised p-3 text-[15px] text-fg outline-none focus:border-line-strong"
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------ couch meter */

export function CouchMeter({
  counts,
  size,
  names,
  colors,
}: {
  counts: [number, number];
  size: number;
  names: [string, string];
  colors: [string, string];
}) {
  const t = useT();
  return (
    <div className="flex w-full max-w-[220px] flex-col gap-2">
      {([0, 1] as Team[]).map((team) => (
        <div key={team} className="flex items-center gap-2" aria-label={`${t.game.couchOf(names[team])}: ${counts[team]}/${size}`}>
          <span className="w-14 truncate text-left text-[12px] text-fg-2">{names[team]}</span>
          <span className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: size }, (_, i) => (
              <span
                key={i}
                className="h-2 flex-1 rounded-full transition-colors duration-300"
                style={{ background: i < counts[team] ? colors[team] : 'var(--color-line)' }}
              />
            ))}
          </span>
          <span className="tabular w-8 text-right text-[12px] text-pot">
            {counts[team]}/{size}
          </span>
        </div>
      ))}
    </div>
  );
}
