# Architecture — Couch of Power

## Overview

```
                   ┌─────────────────────────── Vercel ───────────────────────────┐
 browser (tab)     │  Next.js App Router                                          │
 ┌────────────┐    │   /            home (static)                                 │
 │ React UI   │───▶│   /local       Mode 1 (static, offline via service worker)   │
 │ lib/game   │    │   /tutorial    tutorial (static, uses lib/game)              │
 │ (Mode 1 &  │    │   /r/[code]    online room UI                                │
 │ tutorial)  │    │   /api/rooms/* route handlers  ── authoritative game server ──┼──┐
 └─────┬──────┘    └──────────────────────────────────────────────────────────────┘  │
       │ subscribe (anon key)                                    service-role key   │
       ▼                                                                             ▼
 ┌──────────── Supabase (free tier) ─────────────────────────────────────────────────────┐
 │ Realtime: channel `room:CODE`  — broadcast {v} pings + presence (public ids only)       │
 │ Postgres: table `rooms` (code, state jsonb, version)  — RLS on, NO policies for anon     │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Why Supabase (not PartyKit / Liveblocks)

- **The authoritative logic stays in TypeScript and is shared with Mode 1.** Route handlers on Vercel
  load the room, run the same pure functions from `lib/game/` that the tests cover, and write the
  result back. There is no second runtime or a second copy of the rules.
- **Vercel can't hold WebSockets, but it doesn't need to.** Supabase Realtime holds them. A function
  commits a move and then sends a tiny broadcast (`{v: 42}`) on the room channel. Clients refetch
  **their own** view over HTTPS.
- **Durable state.** If a function cold-starts, a phone sleeps or a tab is refreshed, the room survives
  in Postgres. PartyKit keeps state in a Durable Object, which is fine, but it means a second platform
  account and a second deploy pipeline.
- **Free tier is plenty:** 500 MB DB, 200 concurrent realtime connections, 2M messages/month.
  A 10-player game generates about 1 message per move.
- Liveblocks is built for shared (CRDT) state. Our core requirement is per-player *secret* state,
  which conflicts with that model.

## Security model (secret slips)

- `rooms.state` contains everything: players, auth tokens, seats and **slips**. The table has Row
  Level Security enabled and **no policies**, so the anon key can't read or write it at all. Only the
  server (service-role key, server-only env var) touches it.
- Realtime broadcasts carry **only** `{v}` (a version number). Presence payloads carry only the public
  player id. Neither ever contains slip data.
- Each client calls `GET /api/rooms/CODE` with its private `x-player-token`. The server builds a
  **per-player view** (`toPlayerView`). The view has the public table state plus `me.slipName`, and
  that slip is the caller's only. Other players' slips are not in any response, so there is nothing to
  find in devtools or the network tab.
- Every mutation is `POST /api/rooms/CODE/actions` with `{type, ...}` and the token. The server
  validates:
  - The token maps to a player in this room.
  - The action is allowed in the current phase (lobby / playing / finished).
  - Host-only actions: start, settings, teams, kick, transfer, rematch.
  - `call`: the actor **is** the current caller (the seat clockwise-next to the empty seat), the
    called name exists, and it isn't the caller's own slip.
- **Concurrency:** optimistic locking. `UPDATE rooms SET state=$1, version=v+1 WHERE code=$2 AND
  version=v` (via an RPC). On a conflict, retry up to 3× with fresh state. Two quick double-taps can't
  apply two moves.
- Tokens are 32 random bytes (base64url), stored in `localStorage` per room, which is how a player
  reconnects after a refresh. Kicked players lose their token mapping.

## Data model

```sql
create table rooms (
  code text primary key,           -- 5 chars, no ambiguous glyphs (no 0/O/1/I/L)
  state jsonb not null,            -- RoomState (below)
  version int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table rooms enable row level security;   -- no policies: anon has zero access
```

```ts
RoomState {
  code, phase: 'lobby' | 'playing' | 'finished',
  hostId, createdAt,
  players: { id, name, token, avatarSeed, team: 0|1|null, joinedAt }[],
  settings: { couchSize, swapSlips, allowOwnName, teams: [{name,color},{name,color}] },
  game: GameState | null          // from lib/game
  round: number                   // rematch counter
}

GameState {                        // pure, shared with Mode 1 + tutorial
  seats: (playerId | null)[]       // circle, clockwise, exactly one null
  couchSize: number                // seats [0, couchSize) are the couch
  slips: Record<playerId, playerId>// holder -> whose name is on the slip  (SECRET)
  teams: Record<playerId, 0|1>
  swapSlips: boolean
  turn: number
  log: { turn, callerId, calledId, moverId, swapped }[]
  winner: 0|1|null
}
```

## Game rules as code (`lib/game/`)

| function | does |
|---|---|
| `splitTeams(ids, rng)` | balanced random split (sizes differ by ≤ 1) |
| `dealSlips(ids, {allowOwnName}, rng)` | shuffle; uniform random derangement when own name is not allowed |
| `arrangeSeats(teams, couchSize, rng)` | alternating circle + one empty seat, couch window balanced, no teammates adjacent |
| `currentCaller(game)` | occupant of the seat whose **right-hand** neighbour is the empty seat |
| `callName(game, callerId, calledId)` | validate, move the holder into the empty seat, swap slips if enabled, check the win |
| `checkWinner(game)` | all couch seats occupied by one team |
| `validateSetup(...)` | min players, team balance, couch size ≤ larger team |

**Direction convention.** Seats are indexed clockwise as seen from above. A person sitting in the
circle faces the centre, so their right hand points counter-clockwise. "My right-side seat" is
therefore `seat - 1`. The caller is the occupant of `empty + 1`.

## Realtime and presence on the client

`useRoom(code)`:
1. Fetches the view (`GET`).
2. Subscribes to `room:CODE` broadcast → refetches when `v > current.version`.
3. Tracks Supabase Presence with `{playerId}` to show online/offline dots.
4. Refetches on `visibilitychange`/`online`, and polls every 15s as a safety net.
5. Shows connection status: `connecting | live | reconnecting | offline`.

**Dev fallback.** Without Supabase env vars, the server uses an in-memory store (one Node process,
`next dev`). Clients poll every 1s instead of subscribing, so multiplayer can be tested in several tabs
with zero setup. In production the server **refuses** to run without Supabase.

## Mode 1 (offline)

Runs entirely in the browser with `lib/game` (`splitTeams`, `dealSlips`, `arrangeSeats`). The deal is
kept in memory only, never in storage. The last group of names is kept in `localStorage`. A hand-written
service worker caches the app shell and Mode 1 so it works offline after the first visit.

## Private notes

The notes panel in online play is stored only in `localStorage` (`cop:notes:CODE:round`) and is never
sent to the server.

## Folder layout

```
app/                 routes (/, /local, /online, /r/[code], /tutorial, /api/rooms/...)
components/ui/       design system: Button, Pill, Sheet, Card, Toggle, Stepper, Avatar, Icon…
components/game/     Room (table), Seat, Couch, Slip, NamePicker, EventLog, Notes, WinScreen
lib/game/            pure rules + tests (Vitest)
lib/server/          room store (supabase | memory), actions, views
lib/i18n/            ro (default) / en dictionaries
public/              manifest icons, sw.js
supabase/migrations/ SQL
```
