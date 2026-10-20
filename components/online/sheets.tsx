'use client';

import { ArrowLeftRight, Crown, UserMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Team } from '@/lib/game';
import type { PlayerView, RoomAction, RoomSettings, TeamStyle } from '@/lib/room/types';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Stepper, Toggle } from '@/components/ui/controls';
import { Sheet } from '@/components/ui/sheet';
import { TeamStyleEditor } from '@/components/game/team-style-editor';
import { useT } from '@/lib/i18n/context';
import { teamNames } from '@/lib/team';

type Act = (a: RoomAction) => Promise<string | null>;

/** Host actions on one player: move team (lobby), make host, remove. */
export function PlayerSheet({
  view,
  playerId,
  onClose,
  act,
}: {
  view: PlayerView;
  playerId: string | null;
  onClose: () => void;
  act: Act;
}) {
  const t = useT();
  const p = view.players.find((x) => x.id === playerId);
  const names = teamNames(view.settings.teams, t);
  const isSelf = p?.id === view.meId;
  const run = async (a: RoomAction, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    onClose();
    await act(a);
  };
  return (
    <Sheet open={!!p} onClose={onClose} title={p?.name ?? ''}>
      {p && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 pb-2">
            <Avatar seed={p.avatar} size={56} />
            <div>
              <p className="text-[17px] font-medium">{p.name}</p>
              {p.team !== null && <p className="text-[14px] text-fg-2">{t.teamLabel(names[p.team])}</p>}
            </div>
          </div>
          {view.phase === 'lobby' && (
            <Button
              variant="line"
              size="lg"
              block
              icon={<ArrowLeftRight size={18} />}
              onClick={() => run({ type: 'setTeam', playerId: p.id, team: (p.team === 0 ? 1 : 0) as Team })}
            >
              {t.lobby.moveTo(names[p.team === 0 ? 1 : 0])}
            </Button>
          )}
          {!isSelf && (
            <>
              <Button
                variant="line"
                size="lg"
                block
                icon={<Crown size={18} className="text-gold" />}
                onClick={() => run({ type: 'transferHost', playerId: p.id })}
              >
                {t.lobby.makeHost}
              </Button>
              <Button
                variant="danger"
                size="lg"
                block
                icon={<UserMinus size={18} />}
                onClick={() => run({ type: 'kick', playerId: p.id }, t.lobby.kickConfirm(p.name))}
              >
                {t.lobby.kick}
              </Button>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

export function SettingsSheet({
  view,
  open,
  onClose,
  act,
}: {
  view: PlayerView;
  open: boolean;
  onClose: () => void;
  act: Act;
}) {
  const t = useT();
  const isHost = view.hostId === view.meId;
  const s = view.settings;
  const [styles, setStyles] = useState<[TeamStyle, TeamStyle]>(s.teams);
  // Optimistic so quick repeated taps don't resend a stale value.
  const [couch, setCouch] = useState(s.couchSize);
  useEffect(() => setCouch(s.couchSize), [s.couchSize]);
  useEffect(() => {
    if (open) setStyles(s.teams);
  }, [open, s.teams]);

  const sizes = [0, 1].map((team) => view.players.filter((p) => p.team === team).length);
  const maxCouch = Math.max(2, Math.min(10, Math.max(...sizes)));
  const patch = (p: Partial<RoomSettings>) => act({ type: 'settings', patch: p });
  const dirty = JSON.stringify(styles) !== JSON.stringify(s.teams);

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (isHost && dirty) void patch({ teams: styles });
        onClose();
      }}
      title={t.settings}
    >
      {!isHost && <p className="mb-2 rounded-tile bg-raised p-3 text-[13px] text-fg-2">{t.lobby.settingsReadonly}</p>}
      <div className="flex flex-col">
        <Stepper
          label={t.setup.couchSeats}
          hint={t.setup.couchSeatsHint(maxCouch)}
          value={couch}
          min={2}
          max={Math.max(maxCouch, s.couchSize)}
          disabled={!isHost}
          onChange={(v) => {
            setCouch(v);
            void patch({ couchSize: v });
          }}
        />
        <Toggle
          label={t.setup.swapRule}
          hint={t.setup.swapRuleHint}
          checked={s.swapSlips}
          disabled={!isHost}
          onChange={(v) => patch({ swapSlips: v })}
        />
        <Toggle
          label={t.setup.ownName}
          hint={t.setup.ownNameHint}
          checked={s.allowOwnName}
          disabled={!isHost}
          onChange={(v) => patch({ allowOwnName: v })}
        />
        <h3 className="pt-4 pb-3 text-[13px] font-medium tracking-wide text-fg-2 uppercase">{t.setup.teamNames}</h3>
        <TeamStyleEditor value={styles} onChange={setStyles} disabled={!isHost} />
        {isHost && (
          <Button
            variant="primary"
            size="lg"
            block
            className="mt-5"
            disabled={!dirty}
            onClick={async () => {
              await patch({ teams: styles });
            }}
          >
            {t.done}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
