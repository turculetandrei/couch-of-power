'use client';

import { History, Megaphone, NotebookPen, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { couchCount, type PlayerId } from '@/lib/game';
import type { PlayerView, RoomAction } from '@/lib/room/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { RoomTable, type TablePlayer } from '@/components/game/room-table';
import { SlipCard, SlipFace } from '@/components/game/slip-card';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { vibrate } from '@/lib/storage';
import { teamColors, teamNames } from '@/lib/team';
import { CouchMeter, EventLog, NamePicker, Notes } from './game-parts';
import { PlayerSheet } from './sheets';

type Act = (a: RoomAction) => Promise<string | null>;

export function GameScreen({
  view,
  online,
  act,
  toast,
}: {
  view: PlayerView;
  online: Set<string> | null;
  act: Act;
  toast: (m: string) => void;
}) {
  const t = useT();
  const g = view.game!;
  const [picker, setPicker] = useState(false);
  const [sheet, setSheet] = useState<'log' | 'notes' | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const isHost = view.hostId === view.meId;
  const myTurn = g.callerId === view.meId && g.winner === null;
  const names = teamNames(view.settings.teams, t);
  const colors = teamColors(view.settings.teams);

  const nameOf = useMemo(() => Object.fromEntries(view.players.map((p) => [p.id, p.name])), [view.players]);
  const tablePlayers = useMemo(() => {
    const out: Record<PlayerId, TablePlayer> = {};
    for (const p of view.players) out[p.id] = { id: p.id, name: p.name, avatar: p.avatar, team: g.teams[p.id] ?? 0 };
    return out;
  }, [view.players, g.teams]);
  const offline = useMemo(
    () => (online ? new Set(view.players.filter((p) => !online.has(p.id)).map((p) => p.id)) : undefined),
    [online, view.players],
  );
  const counts = couchCount(g);
  const last = g.log[g.log.length - 1];
  const myTeam = g.teams[view.meId];
  const caller = nameOf[g.callerId];

  // Haptics: a distinct buzz when it becomes my turn, a light tick on every move.
  const prevTurn = useRef(g.turn);
  const prevMine = useRef(myTurn);
  useEffect(() => {
    if (myTurn && !prevMine.current) vibrate([30, 60, 30]);
    else if (g.turn !== prevTurn.current) vibrate(15);
    prevMine.current = myTurn;
    prevTurn.current = g.turn;
  }, [g.turn, myTurn]);

  // Desktop shortcut: "c" opens the picker on my turn.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, dialog')) return;
      if (e.key.toLowerCase() === 'c' && myTurn) {
        e.preventDefault();
        setPicker(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myTurn]);

  async function call(id: PlayerId) {
    setBusy(true);
    const err = await act({ type: 'call', calledId: id });
    setBusy(false);
    if (err) toast(t.errors[err] ?? t.online.error);
    else setPicker(false);
  }

  const notesKey = `cop:notes:${view.code}:${view.round}`;

  const status = (
    <button
      type="button"
      disabled={!myTurn}
      onClick={() => setPicker(true)}
      aria-live="polite"
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-medium transition-colors',
        myTurn ? 'turn-pulse bg-go text-go-ink' : 'border-2 border-line text-fg-2 disabled:cursor-default',
      )}
    >
      {myTurn ? (
        <>
          <Megaphone size={20} /> {t.game.yourTurn}
        </>
      ) : (
        t.game.turnOf(caller)
      )}
    </button>
  );

  const slip = (
    <SlipCard
      name={view.mySlip ? nameOf[view.mySlip] : null}
      caption={t.deal.yourSlip}
      hint={t.game.mySlipHint}
      srLabel={t.game.mySlipSr}
      accent={myTeam !== undefined ? colors[myTeam] : undefined}
      className="aspect-[5/7] w-full"
    />
  );

  return (
    <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start lg:gap-8">
      {/* left: history (desktop) */}
      <aside className="hidden lg:block">
        <h2 className="pb-2 text-[13px] font-medium tracking-wide text-fg-2 uppercase">{t.game.log}</h2>
        <div className="fade-bottom max-h-[70dvh] overflow-y-auto pr-2">
          <EventLog log={g.log} names={nameOf} />
        </div>
      </aside>

      {/* centre: the room */}
      <section className="flex flex-col gap-3">
        <RoomTable
          seats={g.seats}
          couchSize={g.couchSize}
          players={tablePlayers}
          teamColors={colors}
          teamNames={names}
          callerId={g.callerId}
          meId={view.meId}
          offline={offline}
          highlightId={last?.moverId}
          dimIdle
          ratio={1.08}
          label={t.seating.title}
          onSeatClick={isHost ? setSelected : undefined}
          center={
            <div className="flex w-full flex-col items-center gap-3">
              <span className="tabular text-[13px] text-fg-2">{t.game.turn(g.turn + 1)}</span>
              <CouchMeter counts={counts} size={g.couchSize} names={names} colors={colors} />
              {last && (
                <p className="hidden max-w-[26ch] text-[13px] leading-snug text-fg-2 sm:block">
                  {t.game.called(nameOf[last.callerId], nameOf[last.calledId])} → {t.game.moved(nameOf[last.moverId])}
                </p>
              )}
            </div>
          }
        />
        <div className="lg:mx-auto lg:w-full lg:max-w-md">{status}</div>
      </section>

      {/* right: my slip + tools (bottom on phones) */}
      <aside className="safe-bottom grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] gap-3 lg:flex lg:flex-col lg:pb-0">
        <div className="lg:mx-auto lg:w-48">{slip}</div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-1 flex-col justify-between rounded-tile border-2 border-line p-4">
            <span className="text-[13px] text-fg-2">{t.game.yourTeam}</span>
            {myTeam !== undefined && (
              <span className="flex items-center gap-2 text-[20px] font-medium" style={{ color: colors[myTeam] }}>
                {names[myTeam]}
              </span>
            )}
            <span className="tabular text-[28px] leading-none font-light">
              {myTeam !== undefined ? counts[myTeam] : 0}
              <span className="text-[17px] text-fg-2">/{g.couchSize}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <Button variant="line" size="sm" icon={<History size={16} />} onClick={() => setSheet('log')} aria-label={t.game.log}>
              <span className="tabular">{g.log.length}</span>
            </Button>
            <Button variant="line" size="sm" icon={<NotebookPen size={16} />} onClick={() => setSheet('notes')} aria-label={t.game.notes} />
          </div>
        </div>
        <div className="hidden lg:block">
          <h2 className="pb-2 text-[13px] font-medium tracking-wide text-fg-2 uppercase">{t.game.notes}</h2>
          <Notes storageKey={notesKey} players={view.players} meId={view.meId} />
        </div>
      </aside>

      <NamePicker
        open={picker && myTurn}
        onClose={() => setPicker(false)}
        players={view.players}
        mySlip={view.mySlip}
        onCall={call}
        busy={busy}
      />
      <Sheet open={sheet === 'log'} onClose={() => setSheet(null)} title={t.game.log}>
        <EventLog log={g.log} names={nameOf} />
      </Sheet>
      <Sheet open={sheet === 'notes'} onClose={() => setSheet(null)} title={t.game.notes}>
        <Notes storageKey={notesKey} players={view.players} meId={view.meId} />
      </Sheet>
      <PlayerSheet view={view} playerId={selected} onClose={() => setSelected(null)} act={act} />
      {g.winner !== null && <WinPanel view={view} act={act} />}
    </div>
  );
}

function WinPanel({ view, act }: { view: PlayerView; act: Act }) {
  const t = useT();
  const g = view.game!;
  const [busy, setBusy] = useState(false);
  const names = teamNames(view.settings.teams, t);
  const colors = teamColors(view.settings.teams);
  const winner = g.winner!;
  const iWon = g.teams[view.meId] === winner;
  const isHost = view.hostId === view.meId;
  const nameOf = Object.fromEntries(view.players.map((p) => [p.id, p.name]));
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    vibrate(iWon ? [40, 50, 40, 50, 120] : 60);
  }, [iWon]);

  return (
    <Sheet open={!closed} onClose={() => setClosed(true)} title={t.game.winTitle(names[winner])}>
      <div className="flex flex-col items-center gap-4 pb-2 text-center">
        <span
          className="flex size-20 items-center justify-center rounded-full"
          style={{ background: colors[winner], color: '#000' }}
          aria-hidden
        >
          <Trophy size={36} />
        </span>
        <p className="text-[34px] leading-tight font-light">{iWon ? t.game.winYou : t.game.winOther}</p>
        <p className="tabular text-[14px] text-fg-2">{t.game.turnsPlayed(g.turn)}</p>
      </div>
      {g.finalSlips && (
        <section className="mt-4">
          <h3 className="pb-2 text-[13px] font-medium tracking-wide text-fg-2 uppercase">{t.game.whoHadWhat}</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {view.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-tile bg-raised p-2">
                <Avatar seed={p.avatar} size={32} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                <span className="h-10 w-[120px] shrink-0">
                  <SlipFace name={nameOf[g.finalSlips![p.id]] ?? '?'} className="!justify-center !px-3 !py-1 [&>span]:!truncate [&>span]:!text-[15px] [&>svg]:hidden" accent={colors[g.teams[p.id] ?? 0]} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-5 flex flex-col gap-2">
        {isHost ? (
          <>
            <Button
              variant="primary"
              size="lg"
              block
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await act({ type: 'rematch' });
                setBusy(false);
              }}
            >
              {t.game.rematch}
            </Button>
            <Button variant="line" size="lg" block onClick={() => act({ type: 'toLobby' })}>
              {t.game.toLobby}
            </Button>
          </>
        ) : (
          <p className="rounded-full border-2 border-line px-5 py-4 text-center text-[15px] text-fg-2">{t.game.waitRematch}</p>
        )}
      </div>
    </Sheet>
  );
}
