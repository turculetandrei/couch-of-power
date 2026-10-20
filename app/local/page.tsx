'use client';

import { Eye, RefreshCw, Shuffle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  arrangeSeats,
  callerSeat,
  dealSlips,
  setupProblems,
  splitTeams,
  teamSizes,
  type Team,
} from '@/lib/game';
import { DEFAULT_ROOM_SETTINGS } from '@/lib/room/reducer';
import type { TeamStyle } from '@/lib/room/types';
import { Avatar, seedFromName } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Panel, Stepper, Toggle } from '@/components/ui/controls';
import { Sheet } from '@/components/ui/sheet';
import { LangToggle, TopBar } from '@/components/ui/top-bar';
import { RoomTable, type TablePlayer } from '@/components/game/room-table';
import { TeamBoard } from '@/components/game/team-board';
import { TeamStyleEditor } from '@/components/game/team-style-editor';
import { TurnTimer } from '@/components/game/turn-timer';
import { LAST_GROUP_KEY, NamesStep } from '@/components/local/names-step';
import { PassPhone } from '@/components/local/pass-phone';
import { useT } from '@/lib/i18n/context';
import { storage } from '@/lib/storage';
import { teamColors as colorsOf, teamNames as namesOf } from '@/lib/team';

const MIN = 8;
const SETTINGS_KEY = 'cop:localSettings';

interface LocalSettings {
  couchSize: number;
  swapSlips: boolean;
  allowOwnName: boolean;
  teams: [TeamStyle, TeamStyle];
}

type Step = 'names' | 'teams' | 'deal' | 'seating';

interface Deal {
  slips: Record<string, string>;
  seats: (string | null)[];
}

export default function LocalMode() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>('names');
  const [names, setNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [settings, setSettings] = useState<LocalSettings>(() => structuredClone(DEFAULT_ROOM_SETTINGS));
  const [deal, setDeal] = useState<Deal | null>(null);
  const [dealIndex, setDealIndex] = useState(0);
  const [peekFor, setPeekFor] = useState<string | null>(null);
  const [peekPicker, setPeekPicker] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  useEffect(() => {
    const s = storage.get<LocalSettings>(SETTINGS_KEY);
    if (s?.teams?.length === 2) setSettings((cur) => ({ ...cur, ...s }));
  }, []);
  useEffect(() => storage.set(SETTINGS_KEY, settings), [settings]);

  // Keep teams in sync with the name list: new names join the smaller team.
  useEffect(() => {
    setTeams((cur) => {
      const next: Record<string, Team> = {};
      const sizes: [number, number] = [0, 0];
      for (const n of names) if (n in cur) sizes[(next[n] = cur[n])]++;
      for (const n of names)
        if (!(n in next)) {
          const team: Team = sizes[0] <= sizes[1] ? 0 : 1;
          next[n] = team;
          sizes[team]++;
        }
      return next;
    });
  }, [names]);

  const sizes = teamSizes(teams);
  const maxCouch = Math.max(2, Math.max(...sizes));
  const couchSize = Math.min(settings.couchSize, maxCouch);
  const problems = setupProblems(teams, couchSize, MIN);
  const tNames = namesOf(settings.teams, t);
  const tColors = colorsOf(settings.teams);

  // Browser back during the deal must not reveal anything or silently drop it.
  useEffect(() => {
    if (step !== 'deal') return;
    history.pushState({ deal: true }, '');
    const onPop = () => {
      if (confirm(t.deal.leaveGuard)) {
        setDeal(null);
        setStep('teams');
      } else history.pushState({ deal: true }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [step, t]);

  function startDeal() {
    storage.set(LAST_GROUP_KEY, names);
    setDeal({
      slips: dealSlips(names, settings.allowOwnName),
      seats: arrangeSeats(teams, couchSize),
    });
    setDealIndex(0);
    setStep('deal');
  }

  const tablePlayers = useMemo(() => {
    const out: Record<string, TablePlayer> = {};
    for (const n of names) out[n] = { id: n, name: n, avatar: seedFromName(n), team: teams[n] ?? 0 };
    return out;
  }, [names, teams]);

  const stepNo = { names: 1, teams: 2, deal: 3, seating: 4 }[step];

  /* ---------------------------------------------------------- peek again */
  if (peekFor && deal) {
    return (
      <Shell title={t.seating.peekAgain} onBack={() => setPeekFor(null)}>
        <p className="mb-2 rounded-tile bg-raised p-3 text-[13px] text-fg-2">{t.seating.peekNote}</p>
        <PassPhone
          holder={peekFor}
          slipName={deal.slips[peekFor]}
          accent={tColors[teams[peekFor] ?? 0]}
          onDone={() => setPeekFor(null)}
        />
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- deal */
  if (step === 'deal' && deal) {
    const holder = names[dealIndex];
    return (
      <Shell
        title={t.setup.step(3, 4)}
        onBack={() => {
          if (confirm(t.deal.leaveGuard)) {
            setDeal(null);
            setStep('teams');
          }
        }}
      >
        <PassPhone
          key={holder}
          holder={holder}
          slipName={deal.slips[holder]}
          accent={tColors[teams[holder] ?? 0]}
          progress={t.deal.progress(dealIndex + 1, names.length)}
          onDone={() => {
            if (dealIndex + 1 < names.length) setDealIndex(dealIndex + 1);
            else setStep('seating');
          }}
        />
      </Shell>
    );
  }

  /* ------------------------------------------------------------- seating */
  if (step === 'seating' && deal) {
    const first = deal.seats[callerSeat(deal)] as string;
    return (
      <Shell title={t.setup.step(4, 4)} onBack={() => setStep('teams')} wide>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="text-[32px] leading-tight font-light">{t.deal.allDone}</h1>
            <p className="mt-1 text-[15px] text-fg-2">{t.deal.allDoneSub}</p>
            <RoomTable
              className="mt-4"
              ratio={1.1}
              seats={deal.seats}
              couchSize={couchSize}
              players={tablePlayers}
              teamColors={tColors}
              teamNames={tNames}
              callerId={first}
              label={t.seating.title}
              center={
                <div className="flex max-w-[24ch] flex-col items-center gap-1">
                  <span className="text-[13px] text-fg-2">{t.seating.couch}</span>
                  <span className="text-[15px] leading-snug">{t.seating.firstCaller(first)}</span>
                </div>
              }
            />
          </div>
          <div className="flex flex-col gap-3 lg:pt-24">
            <TurnTimer />
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="line"
                icon={<Shuffle size={18} />}
                onClick={() => setDeal({ ...deal, seats: arrangeSeats(teams, couchSize) })}
              >
                {t.seating.reshuffle}
              </Button>
              <Button variant="line" icon={<Eye size={18} />} onClick={() => setPeekPicker(true)}>
                {t.seating.peekAgain}
              </Button>
            </div>
            <Button
              variant="outline"
              size="lg"
              icon={<RefreshCw size={18} />}
              onClick={() => {
                if (confirm(t.deal.redealConfirm)) startDeal();
              }}
            >
              {t.deal.redeal}
            </Button>
            <Button
              variant="ghost"
              icon={<Users size={18} />}
              onClick={() => {
                setDeal(null);
                setStep('names');
              }}
            >
              {t.seating.newGroup}
            </Button>
          </div>
        </div>
        <Sheet open={peekPicker} onClose={() => setPeekPicker(false)} title={t.seating.peekWho}>
          <ul className="grid grid-cols-2 gap-2">
            {names.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => {
                    setPeekPicker(false);
                    setPeekFor(n);
                  }}
                  className="flex h-14 w-full items-center gap-2 rounded-full bg-raised pr-3 pl-1.5 text-left hover:bg-[#242427]"
                >
                  <Avatar seed={seedFromName(n)} size={40} />
                  <span className="truncate text-[15px]">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      </Shell>
    );
  }

  /* --------------------------------------------------------------- teams */
  if (step === 'teams') {
    return (
      <Shell title={t.setup.step(2, 4)} onBack={() => setStep('names')}>
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-[32px] leading-tight font-light">{t.setup.teamsTitle}</h1>
              <p className="mt-1 text-[14px] text-fg-2">{t.setup.teamsHint}</p>
            </div>
          </div>
          <Button variant="line" size="sm" icon={<Shuffle size={16} />} className="self-start" onClick={() => setTeams(splitTeams(names))}>
            {t.setup.autoSplit}
          </Button>
          <TeamBoard
            players={names.map((n) => ({ id: n, name: n, avatar: seedFromName(n), team: teams[n] ?? null }))}
            teamNames={tNames}
            teamColors={tColors}
            editable
            onMove={(id, team) => team !== null && setTeams({ ...teams, [id]: team })}
            onTap={(p) => setTeams({ ...teams, [p.id]: (1 - (teams[p.id] ?? 0)) as Team })}
          />
          {problems.some((p) => p.code === 'teams_unbalanced') && (
            <p role="alert" className="text-[14px] text-pot">
              {t.setup.unbalanced}
            </p>
          )}

          <Panel className="flex flex-col py-2">
            <h2 className="pt-2 text-[13px] font-medium tracking-wide text-fg-2 uppercase">{t.setup.rulesTitle}</h2>
            <Stepper
              label={t.setup.couchSeats}
              hint={t.setup.couchSeatsHint(maxCouch)}
              value={couchSize}
              min={2}
              max={maxCouch}
              onChange={(v) => setSettings({ ...settings, couchSize: v })}
            />
            <Toggle
              label={t.setup.swapRule}
              hint={t.setup.swapRuleHint}
              checked={settings.swapSlips}
              onChange={(v) => setSettings({ ...settings, swapSlips: v })}
            />
            <Toggle
              label={t.setup.ownName}
              hint={t.setup.ownNameHint}
              checked={settings.allowOwnName}
              onChange={(v) => setSettings({ ...settings, allowOwnName: v })}
            />
            <button
              type="button"
              onClick={() => setStyleOpen(true)}
              className="flex min-h-14 items-center justify-between gap-3 py-3 text-left text-[16px]"
            >
              {t.setup.teamNames}
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-5 rounded-full" style={{ background: tColors[0] }} />
                <span className="size-5 rounded-full" style={{ background: tColors[1] }} />
              </span>
            </button>
          </Panel>
        </div>
        <BottomBar>
          <Button variant="primary" size="lg" block disabled={problems.length > 0} onClick={startDeal}>
            {t.setup.deal}
          </Button>
        </BottomBar>
        <Sheet open={styleOpen} onClose={() => setStyleOpen(false)} title={t.setup.teamNames}>
          <TeamStyleEditor value={settings.teams} onChange={(teams) => setSettings({ ...settings, teams })} />
        </Sheet>
      </Shell>
    );
  }

  /* --------------------------------------------------------------- names */
  const missing = Math.max(0, MIN - names.length);
  return (
    <Shell title={t.setup.step(stepNo, 4)} onBack={() => router.push('/')}>
      <div className="pb-4">
        <NamesStep names={names} onChange={setNames} />
      </div>
      <BottomBar>
        {names.length % 2 === 1 && names.length >= MIN && (
          <p className="mb-2 text-center text-[13px] text-fg-2">{t.setup.oddWarning}</p>
        )}
        <Button variant="primary" size="lg" block disabled={missing > 0} onClick={() => setStep('teams')}>
          {missing > 0 ? t.setup.needMore(missing) : `${t.continue} · ${t.playersCount(names.length)}`}
        </Button>
      </BottomBar>
    </Shell>
  );
}

function Shell({
  title,
  onBack,
  children,
  wide,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={`mx-auto flex min-h-dvh flex-col px-4 ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
      <TopBar onBack={onBack} title={<span className="text-[15px] font-normal text-fg-2">{title}</span>} right={<LangToggle />} />
      <div className="flex flex-1 flex-col pt-2">{children}</div>
    </main>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return <div className="safe-bottom sticky bottom-0 mt-auto bg-gradient-to-t from-black from-70% to-transparent pt-6">{children}</div>;
}
