'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PlayerId, Team } from '@/lib/game';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/i18n/context';

export interface TablePlayer {
  id: PlayerId;
  name: string;
  avatar: number;
  team: Team;
}

export interface RoomTableProps {
  seats: (PlayerId | null)[];
  couchSize: number;
  players: Record<PlayerId, TablePlayer>;
  teamColors: [string, string];
  teamNames: [string, string];
  callerId?: PlayerId | null;
  meId?: PlayerId | null;
  /** Players known to be offline (online mode). */
  offline?: Set<PlayerId>;
  /** Briefly emphasise (e.g. the last mover). */
  highlightId?: PlayerId | null;
  /** Dim everyone except the caller, like inactive players in the reference. */
  dimIdle?: boolean;
  onSeatClick?: (id: PlayerId) => void;
  /** Players that react to clicks (others are inert). Defaults to all when onSeatClick is set. */
  clickable?: Set<PlayerId>;
  center?: ReactNode;
  className?: string;
  /** Height/width ratio for the stage. */
  ratio?: number;
  label?: string;
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** Geometry for a seat diameter `d`: a rounded rectangle with the couch on its top edge. */
function geometry(W: number, H: number, k: number, d: number) {
  const padX = d * 0.55 + 8;
  const padTop = d * 0.95 + 8;
  const padBottom = d * 0.5 + 24;
  const w = W - 2 * padX;
  const h = H - padTop - padBottom;
  const r = Math.min(w, h) * 0.16;
  const P = 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
  const top = w - 2 * r;
  const cw = Math.min(top, k * d * 1.22);
  return { d, padX, padTop, w, h, r, P, cw, top };
}

/** Largest seat that fits: couch seats side by side on the top edge, the rest spaced around. */
function layout(W: number, H: number, S: number, k: number) {
  const fits = (d: number) => {
    const g = geometry(W, H, k, d);
    const restGap = (g.P - g.cw) / Math.max(1, S - k);
    return g.w > 0 && g.h > 0 && g.cw / k >= d * 1.06 && restGap >= d + 16;
  };
  let lo = 26;
  let hi = 68;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return geometry(W, H, k, Math.floor(lo));
}

function pointAt(s: number, x0: number, y0: number, w: number, h: number, r: number, P: number) {
  s = ((s % P) + P) % P;
  const segs: [number, (t: number) => [number, number]][] = [
    [w - 2 * r, (t) => [x0 + r + t, y0]],
    [(Math.PI * r) / 2, (t) => arc(x0 + w - r, y0 + r, -Math.PI / 2 + t / r)],
    [h - 2 * r, (t) => [x0 + w, y0 + r + t]],
    [(Math.PI * r) / 2, (t) => arc(x0 + w - r, y0 + h - r, t / r)],
    [w - 2 * r, (t) => [x0 + w - r - t, y0 + h]],
    [(Math.PI * r) / 2, (t) => arc(x0 + r, y0 + h - r, Math.PI / 2 + t / r)],
    [h - 2 * r, (t) => [x0, y0 + h - r - t]],
    [(Math.PI * r) / 2, (t) => arc(x0 + r, y0 + r, Math.PI + t / r)],
  ];
  function arc(cx: number, cy: number, a: number): [number, number] {
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }
  for (const [len, f] of segs) {
    if (s <= len) return f(s);
    s -= len;
  }
  return [x0 + r, y0];
}

export function RoomTable({
  seats,
  couchSize,
  players,
  teamColors,
  teamNames,
  callerId,
  meId,
  offline,
  highlightId,
  dimIdle,
  onSeatClick,
  clickable,
  center,
  className,
  ratio = 1.05,
  label,
}: RoomTableProps) {
  const t = useT();
  const reduce = useReducedMotion();
  const [ref, { w: W, h: H }] = useSize<HTMLDivElement>();
  const S = seats.length;
  const k = couchSize;

  const geo = useMemo(() => {
    if (!W || !H) return null;
    const L = layout(W, H, S, k);
    const x0 = L.padX;
    const y0 = L.padTop;
    const s0 = (L.top - L.cw) / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i < S; i++) {
      const s =
        i < k ? s0 + (L.cw * (i + 0.5)) / k : s0 + L.cw + ((L.P - L.cw) * (i - k + 0.5)) / Math.max(1, S - k);
      pts.push(pointAt(s, x0, y0, L.w, L.h, L.r, L.P) as [number, number]);
    }
    return { ...L, x0, y0, s0, pts };
  }, [W, H, S, k]);

  const emptyIdx = seats.indexOf(null);
  const callerIdx = callerId ? seats.indexOf(callerId) : -1;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn('relative w-full select-none', className)}
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      {geo && (
        <>
          {/* the room outline */}
          <div
            aria-hidden
            className="absolute border-2 border-line"
            style={{
              left: geo.x0,
              top: geo.y0,
              width: geo.w,
              height: geo.h,
              borderRadius: geo.r,
            }}
          />

          <Couch geo={geo} k={k} seats={seats} players={players} teamColors={teamColors} />

          {center && (
            <div
              className="absolute flex flex-col items-center justify-center text-center"
              style={{
                left: geo.x0 + geo.d * 0.75,
                right: W - geo.x0 - geo.w + geo.d * 0.75,
                top: geo.y0 + geo.d * 1.05,
                bottom: H - geo.y0 - geo.h + geo.d * 0.75,
              }}
            >
              {center}
            </div>
          )}

          {/* direction cue: caller -> empty seat */}
          {callerIdx >= 0 && emptyIdx >= 0 && (
            <DirectionCue from={geo.pts[callerIdx]} to={geo.pts[emptyIdx]} d={geo.d} />
          )}

          {/* empty seat */}
          {emptyIdx >= 0 && (
            <motion.div
              key="empty"
              className="absolute flex flex-col items-center"
              initial={false}
              animate={{ left: geo.pts[emptyIdx][0] - geo.d / 2, top: geo.pts[emptyIdx][1] - geo.d / 2 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
              style={{ width: geo.d }}
              role="img"
              aria-label={t.seating.emptyLabel(emptyIdx)}
            >
              <div
                className="empty-glow rounded-full border-2 border-dashed border-go bg-go/10"
                style={{ width: geo.d, height: geo.d }}
              />
              <span className="mt-1 text-[12px] font-medium text-go">{t.seating.empty}</span>
            </motion.div>
          )}

          {seats.map((id, i) => {
            if (!id) return null;
            const p = players[id];
            if (!p) return null;
            const [x, y] = geo.pts[i];
            const isCaller = id === callerId;
            const isMe = id === meId;
            const isOff = offline?.has(id);
            const onCouch = i < k;
            const canClick = !!onSeatClick && (!clickable || clickable.has(id));
            const teamName = teamNames[p.team];
            const Tag = canClick ? 'button' : 'div';
            return (
              <motion.div
                key={id}
                className="absolute"
                initial={false}
                animate={{ left: x - geo.d / 2, top: y - geo.d / 2 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28 }}
                style={{ width: geo.d, zIndex: isCaller ? 3 : 2 }}
              >
                <Tag
                  {...(canClick ? { type: 'button' as const, onClick: () => onSeatClick?.(id) } : { role: 'img' })}
                  aria-label={
                    t.seating.seatLabel(i, isMe ? `${p.name} (${t.you})` : p.name, t.teamLabel(teamName), onCouch) +
                    (isCaller ? ` · ${t.game.callerBadge}` : '') +
                    (isOff ? ` · ${t.lobby.offline}` : '')
                  }
                  className={cn(
                    'group flex w-full flex-col items-center rounded-full transition-opacity duration-300',
                    dimIdle && !isCaller && !isMe && 'opacity-50',
                    canClick && 'cursor-pointer',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex items-center justify-center rounded-full bg-raised',
                      highlightId === id && !reduce && 'turn-pulse',
                      canClick && 'group-hover:brightness-110',
                    )}
                    style={{
                      width: geo.d,
                      height: geo.d,
                      boxShadow: isCaller
                        ? `inset 0 0 0 2.5px ${teamColors[p.team]}, 0 0 0 3px #000, 0 0 0 5.5px var(--color-go)`
                        : `inset 0 0 0 2.5px ${teamColors[p.team]}`,
                    }}
                  >
                    <Avatar seed={p.avatar} size={geo.d - 8} className={cn(isOff && 'opacity-40 grayscale')} />
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full text-[10px] font-semibold text-black ring-2 ring-black"
                      style={{ background: teamColors[p.team], width: 17, height: 17 }}
                    >
                      {teamName.slice(0, 1).toUpperCase()}
                    </span>
                    {isOff && (
                      <span aria-hidden className="absolute -top-0.5 -left-0.5 size-3 rounded-full bg-fg-3 ring-2 ring-black" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'relative mt-1 block max-w-[calc(100%+24px)] truncate rounded-full bg-black px-1.5 text-center text-[12px] leading-tight',
                      isCaller ? 'font-medium text-go' : isMe ? 'font-semibold text-fg' : 'text-fg-2',
                    )}
                  >
                    {isMe ? t.you : p.name}
                  </span>
                </Tag>
              </motion.div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Couch({
  geo,
  k,
  seats,
  players,
  teamColors,
}: {
  geo: { x0: number; y0: number; r: number; s0: number; cw: number; d: number };
  k: number;
  seats: (PlayerId | null)[];
  players: Record<PlayerId, TablePlayer>;
  teamColors: [string, string];
}) {
  const { d } = geo;
  const left = geo.x0 + geo.r + geo.s0 - d * 0.38;
  const width = geo.cw + d * 0.76;
  const top = geo.y0 - d * 0.88;
  const height = d * 1.5;
  const arm = d * 0.32;
  const cell = geo.cw / k;
  const owners = seats.slice(0, k).map((id) => (id ? players[id]?.team : undefined));
  const full = owners.every((o) => o !== undefined && o === owners[0]);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute overflow-visible"
      style={{ left, top, width, height }}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* backrest */}
      <rect
        x={arm * 0.55}
        y={0}
        width={width - arm * 1.1}
        height={height * 0.6}
        rx={d * 0.32}
        fill="#0b0b0c"
        stroke={full && owners[0] !== undefined ? teamColors[owners[0]] : 'var(--color-line-strong)'}
        strokeWidth={3}
      />
      {/* seat cushions, tinted by who sits there */}
      {owners.map((o, i) => (
        <rect
          key={i}
          x={d * 0.38 + cell * i + 2}
          y={height * 0.28}
          width={cell - 4}
          height={height * 0.6}
          rx={d * 0.22}
          fill={o === undefined ? '#0b0b0c' : teamColors[o]}
          fillOpacity={o === undefined ? 1 : 0.2}
          stroke="var(--color-line)"
          strokeWidth={2}
          style={{ transition: 'fill 300ms, fill-opacity 300ms' }}
        />
      ))}
      {/* armrests */}
      <rect x={0} y={height * 0.16} width={arm} height={height * 0.8} rx={arm / 2} fill="#0b0b0c" stroke="var(--color-line-strong)" strokeWidth={3} />
      <rect x={width - arm} y={height * 0.16} width={arm} height={height * 0.8} rx={arm / 2} fill="#0b0b0c" stroke="var(--color-line-strong)" strokeWidth={3} />
    </svg>
  );
}

function DirectionCue({ from, to, d }: { from: [number, number]; to: [number, number]; d: number }) {
  const reduce = useReducedMotion();
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  const size = Math.max(14, d * 0.34);
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute z-[4] flex items-center justify-center rounded-full bg-black"
      initial={false}
      animate={{ left: mx - size / 2, top: my - size / 2, rotate: angle }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" width={size * 0.8} height={size * 0.8}>
        <path d="M5 3l5 5-5 5" fill="none" stroke="var(--color-go)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
