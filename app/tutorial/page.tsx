'use client';

import { ArrowLeftRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { callName, currentCaller, type GameState, type Team } from '@/lib/game';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button, ButtonLink } from '@/components/ui/button';
import { LangToggle, TopBar } from '@/components/ui/top-bar';
import { RoomTable, type TablePlayer } from '@/components/game/room-table';
import { SlipCard, SlipFace } from '@/components/game/slip-card';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';
import { TEAM_COLORS } from '@/lib/room/types';
import { vibrate } from '@/lib/storage';

const A = ['Ioana', 'Maria', 'Elena', 'Ana'];
const B = ['Dan', 'Vlad', 'Mihai', 'Radu'];
const teams: Record<string, Team> = Object.fromEntries([...A.map((n) => [n, 0]), ...B.map((n) => [n, 1])]);

// Ioana sits with the empty seat on her right; Maria holds the "Dan" slip.
const START: GameState = {
  seats: ['Elena', 'Vlad', 'Ana', 'Mihai', 'Maria', 'Radu', null, 'Ioana', 'Dan'],
  couchSize: 4,
  slips: { Ioana: 'Vlad', Maria: 'Dan', Elena: 'Radu', Ana: 'Mihai', Dan: 'Ana', Vlad: 'Elena', Mihai: 'Ioana', Radu: 'Maria' },
  teams,
  swapSlips: true,
  turn: 0,
  log: [],
  winner: null,
};

const WON: GameState = {
  ...START,
  seats: ['Elena', 'Ioana', 'Ana', 'Maria', 'Vlad', null, 'Radu', 'Mihai', 'Dan'],
  winner: 0,
};

const colors: [string, string] = [TEAM_COLORS[0], TEAM_COLORS[1]];

export default function Tutorial() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [game, setGame] = useState<GameState>(START);
  const steps = t.tutorial.steps;
  const last = step === steps.length - 1;

  const players = useMemo(() => {
    const out: Record<string, TablePlayer> = {};
    for (const n of [...A, ...B]) out[n] = { id: n, name: n, avatar: seedFromName(n), team: teams[n] };
    return out;
  }, []);

  const shown = step === 5 ? WON : game;
  const caller = step >= 2 && step <= 3 ? currentCaller(game) : step === 4 ? currentCaller(game) : null;

  function go(n: number) {
    if (n <= 3) setGame(START);
    setStep(n);
  }

  function callDan() {
    setGame(callName(START, 'Ioana', 'Dan'));
    vibrate(15);
    setStep(4);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
      <TopBar
        back="/"
        title={<span className="text-[15px] font-normal text-fg-2">{t.tutorial.title}</span>}
        right={
          <>
            <LangToggle />
            {!last && (
              <Button variant="ghost" size="sm" onClick={() => go(steps.length - 1)}>
                {t.tutorial.skip}
              </Button>
            )}
          </>
        }
      />

      <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_380px] md:items-center md:gap-10">
        <RoomTable
          seats={shown.seats}
          couchSize={4}
          players={players}
          teamColors={colors}
          teamNames={t.teamDefault}
          callerId={caller}
          highlightId={step === 4 ? 'Maria' : null}
          dimIdle={step === 2 || step === 3}
          ratio={1}
          label={t.seating.title}
          onSeatClick={step === 3 ? (id) => id === 'Dan' && callDan() : undefined}
          clickable={step === 3 ? new Set(['Dan']) : undefined}
          center={
            step === 5 ? (
              <span className="text-[15px] font-medium" style={{ color: colors[0] }}>
                {t.game.winTitle(t.teamDefault[0])}
              </span>
            ) : step === 0 ? (
              <span className="max-w-[20ch] text-[13px] text-fg-2">{t.seating.sub}</span>
            ) : null
          }
        />

        <section className="safe-bottom flex flex-col gap-4" aria-live="polite">
          <div className="flex gap-1.5" aria-label={`${step + 1} / ${steps.length}`}>
            {steps.map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-fg' : 'bg-line')} />
            ))}
          </div>
          <div>
            <h1 className="text-[28px] leading-tight font-light">{steps[step].title}</h1>
            <p className="mt-2 text-[16px] leading-snug text-fg-2">{steps[step].body}</p>
          </div>

          {step === 1 && (
            <div className="flex items-center gap-4">
              <SlipCard
                name={START.slips.Ioana}
                caption={t.deal.yourSlip}
                hint={t.deal.holdToSee}
                srLabel={`${t.deal.yourSlip}. ${t.deal.holdToSee}`}
                accent={colors[0]}
                className="h-[168px] w-[120px]"
              />
              <p className="text-[13px] text-fg-3">{t.deal.holdHintKeyboard}</p>
            </div>
          )}

          {step === 3 && (
            <ul className="grid grid-cols-4 gap-2" aria-label={t.game.callTitle}>
              {[...A, ...B].sort().map((n) => (
                <li key={n}>
                  <button
                    type="button"
                    disabled={n !== 'Dan'}
                    onClick={callDan}
                    className={cn(
                      'flex w-full flex-col items-center gap-1 rounded-tile border-2 py-2 text-[12px]',
                      n === 'Dan' ? 'turn-pulse border-go bg-go/10 text-fg' : 'border-line text-fg-3',
                    )}
                  >
                    <Avatar seed={seedFromName(n)} size={32} className={n === 'Dan' ? '' : 'opacity-40'} />
                    {n}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {step === 4 && (
            <div className="flex items-center gap-3 rounded-tile border-2 border-line p-3">
              <MiniSlip who="Ioana" name={game.slips.Ioana} />
              <ArrowLeftRight className="shrink-0 text-fg-2" size={20} aria-label={t.game.swapped} />
              <MiniSlip who="Maria" name={game.slips.Maria} />
            </div>
          )}

          <div className="mt-auto flex gap-2 pt-2 md:mt-4">
            {step > 0 && (
              <Button variant="line" size="lg" onClick={() => go(step - 1)}>
                {t.back}
              </Button>
            )}
            {last ? (
              <ButtonLink href="/" variant="primary" size="lg" className="flex-1">
                {t.tutorial.play}
              </ButtonLink>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={step === 3}
                onClick={() => go(step + 1)}
              >
                {step === 3 ? t.game.callCta('Dan') : t.tutorial.next}
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniSlip({ who, name }: { who: string; name: string }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Avatar seed={seedFromName(who)} size={32} />
      <div className="min-w-0">
        <p className="text-[12px] text-fg-2">{who}</p>
        <div className="mt-1 h-9 w-[84px]">
          <SlipFace name={name} accent={colors[0]} className="!justify-center !px-2 !py-1 [&>span]:!text-[14px] [&>svg]:hidden" />
        </div>
      </div>
    </div>
  );
}
