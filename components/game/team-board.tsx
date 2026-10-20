'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Crown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Team } from '@/lib/game';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';

export interface BoardPlayer {
  id: string;
  name: string;
  avatar: number;
  team: Team | null;
  isHost?: boolean;
  isMe?: boolean;
  offline?: boolean;
}

type Column = 'team0' | 'team1' | 'none';
const colTeam = (c: Column): Team | null => (c === 'team0' ? 0 : c === 'team1' ? 1 : null);

export function TeamBoard({
  players,
  teamNames,
  teamColors,
  editable,
  onMove,
  onTap,
  showUnassigned,
  tapHint,
}: {
  players: BoardPlayer[];
  teamNames: [string, string];
  teamColors: [string, string];
  editable: boolean;
  onMove: (id: string, team: Team | null) => void;
  onTap?: (p: BoardPlayer) => void;
  showUnassigned?: boolean;
  tapHint?: string;
}) {
  const t = useT();
  const [dragging, setDragging] = useState<BoardPlayer | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const byTeam = (team: Team | null) => players.filter((p) => p.team === team);
  const unassigned = byTeam(null);

  function end(e: DragEndEvent) {
    setDragging(null);
    const col = e.over?.id as Column | undefined;
    if (!col) return;
    const id = String(e.active.id);
    const team = colTeam(col);
    if (players.find((p) => p.id === id)?.team !== team) onMove(id, team);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setDragging(players.find((p) => p.id === e.active.id) ?? null)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={end}
      accessibility={{
        screenReaderInstructions: { draggable: tapHint ?? t.setup.teamsHint },
      }}
    >
      {(showUnassigned || unassigned.length > 0) && unassigned.length > 0 && (
        <DropColumn id="none" title={t.noTeam} color="var(--color-fg-3)" count={unassigned.length}>
          {unassigned.map((p) => (
            <Chip key={p.id} p={p} color="var(--color-fg-3)" editable={editable} onTap={onTap} />
          ))}
        </DropColumn>
      )}
      <div className="grid grid-cols-2 gap-3">
        {([0, 1] as const).map((team) => {
          const list = byTeam(team);
          return (
            <DropColumn
              key={team}
              id={team === 0 ? 'team0' : 'team1'}
              title={teamNames[team]}
              color={teamColors[team]}
              count={list.length}
            >
              {list.map((p) => (
                <Chip key={p.id} p={p} color={teamColors[team]} editable={editable} onTap={onTap} />
              ))}
            </DropColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="flex h-12 items-center gap-2 rounded-full border-2 border-fg bg-raised pr-4 pl-1.5 shadow-2xl">
            <Avatar seed={dragging.avatar} size={36} />
            <span className="text-[15px] font-medium">{dragging.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DropColumn({
  id,
  title,
  color,
  count,
  children,
}: {
  id: Column;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${title} (${count})`}
      className={cn(
        'mb-3 min-h-28 rounded-tile border-2 p-2 transition-colors',
        isOver ? 'bg-white/[0.03]' : 'border-line',
      )}
      style={isOver ? { borderColor: color } : undefined}
    >
      <header className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="flex items-center gap-2 text-[14px] font-medium">
          <span className="size-2.5 rounded-full" style={{ background: color }} aria-hidden />
          {title}
        </span>
        <span className="tabular rounded-full bg-raised px-2 py-0.5 text-[13px] font-medium text-pot">{count}</span>
      </header>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function Chip({
  p,
  color,
  editable,
  onTap,
}: {
  p: BoardPlayer;
  color: string;
  editable: boolean;
  onTap?: (p: BoardPlayer) => void;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: !editable });
  const interactive = editable || !!onTap;
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        disabled={!interactive}
        onClick={() => onTap?.(p)}
        {...(editable ? listeners : {})}
        {...(editable ? attributes : {})}
        className={cn(
          'flex h-12 w-full touch-manipulation items-center gap-2 rounded-full bg-raised pr-3 pl-1.5 text-left disabled:cursor-default',
          isDragging && 'opacity-30',
          interactive && 'hover:bg-[#242427]',
        )}
        style={{ boxShadow: `inset 3px 0 0 ${color}` }}
      >
        <Avatar seed={p.avatar} size={36} className={cn(p.offline && 'opacity-40 grayscale')} />
        <span className="min-w-0 flex-1 truncate text-[15px]">
          {p.name}
          {p.isMe && <span className="text-fg-2"> · {t.you}</span>}
        </span>
        {p.isHost && <Crown size={16} className="shrink-0 text-gold" aria-label={t.lobby.host} />}
        {p.offline && <span className="size-2 shrink-0 rounded-full bg-fg-3" aria-label={t.lobby.offline} />}
      </button>
    </li>
  );
}
