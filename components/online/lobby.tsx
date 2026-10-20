'use client';

import { Settings2, Share2, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { setupProblems, type Team } from '@/lib/game';
import type { PlayerView, RoomAction } from '@/lib/room/types';
import { Button } from '@/components/ui/button';
import { TeamBoard } from '@/components/game/team-board';
import { useT } from '@/lib/i18n/context';
import { teamColors, teamNames } from '@/lib/team';
import { ShareSheet } from './bits';
import { PlayerSheet, SettingsSheet } from './sheets';

export function Lobby({
  view,
  online,
  act,
}: {
  view: PlayerView;
  online: Set<string> | null;
  act: (a: RoomAction) => Promise<string | null>;
}) {
  const t = useT();
  const [share, setShare] = useState(false);
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const isHost = view.hostId === view.meId;
  const names = teamNames(view.settings.teams, t);
  const colors = teamColors(view.settings.teams);
  const host = view.players.find((p) => p.id === view.hostId);

  const teams: Record<string, Team | null> = {};
  for (const p of view.players) teams[p.id] = p.team;
  const problems = setupProblems(teams, view.settings.couchSize, view.minPlayers);
  const problemText = problems
    .map((p) =>
      p.code === 'too_few_players'
        ? t.lobby.problem.too_few_players(p.min)
        : p.code === 'bad_couch_size'
          ? t.lobby.problem.bad_couch_size(p.max)
          : t.lobby.problem[p.code],
    )
    .join(' · ');

  return (
    <div className="flex flex-1 flex-col">
      <section className="flex items-end justify-between gap-4 pt-4 pb-6">
        <div>
          <p className="text-[13px] tracking-wide text-fg-2 uppercase">{t.online.code}</p>
          <p className="tabular mt-1 text-[48px] leading-none font-light tracking-[0.18em] md:text-[64px]">{view.code}</p>
        </div>
        <Button variant="outline" icon={<Share2 size={18} />} onClick={() => setShare(true)}>
          {t.lobby.share}
        </Button>
      </section>

      <div className="flex items-center justify-between gap-2 pb-3">
        <h2 className="text-[17px] font-medium">
          {t.players} <span className="tabular text-pot">{view.players.length}</span>
        </h2>
        <div className="flex gap-2">
          {isHost && (
            <Button size="sm" variant="line" icon={<Shuffle size={16} />} onClick={() => act({ type: 'autoTeams' })}>
              <span className="max-[380px]:sr-only">{t.setup.autoSplit}</span>
            </Button>
          )}
          <Button size="sm" variant="line" icon={<Settings2 size={16} />} onClick={() => setSettings(true)}>
            <span className="max-[380px]:sr-only">{t.settings}</span>
          </Button>
        </div>
      </div>

      {isHost && <p className="-mt-1 pb-3 text-[13px] text-fg-2">{t.setup.teamsHint}</p>}

      <TeamBoard
        players={view.players.map((p) => ({
          ...p,
          isHost: p.id === view.hostId,
          isMe: p.id === view.meId,
          offline: online ? !online.has(p.id) : false,
        }))}
        teamNames={names}
        teamColors={colors}
        editable={isHost}
        onMove={(id, team) => act({ type: 'setTeam', playerId: id, team })}
        onTap={isHost ? (p) => setSelected(p.id) : undefined}
      />

      <div className="safe-bottom sticky bottom-0 mt-auto bg-gradient-to-t from-black from-70% to-transparent pt-6">
        {isHost ? (
          <>
            {problemText && (
              <p role="status" className="pb-2 text-center text-[13px] text-pot">
                {problemText}
              </p>
            )}
            <Button
              variant="primary"
              size="lg"
              block
              disabled={problems.length > 0 || starting}
              onClick={async () => {
                setStarting(true);
                await act({ type: 'start' });
                setStarting(false);
              }}
            >
              {t.lobby.start}
            </Button>
          </>
        ) : (
          <div
            role="status"
            className="flex h-14 items-center justify-center rounded-full border-2 border-line px-5 text-center text-[16px] text-fg-2"
          >
            {t.lobby.waitingHost(host?.name ?? '')}
          </div>
        )}
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} code={view.code} />
      <SettingsSheet view={view} open={settings} onClose={() => setSettings(false)} act={act} />
      <PlayerSheet view={view} playerId={selected} onClose={() => setSelected(null)} act={act} />
    </div>
  );
}
