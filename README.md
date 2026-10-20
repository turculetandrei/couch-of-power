# Couch of Power

**Live:** https://couch-of-power.vercel.app

A mobile-first web app for the party game **Couch of Power** (also known as "Four on the Couch" or "Parliament").

- **Doar împărțire nume** (`/local`): one phone, everyone in the same room. Enter names, split the teams, deal secret slips pass-the-phone style, and get a suggested seating plan and a turn timer. Works offline and has no accounts.
- **Joc online** (`/online`, `/r/CODE`): everyone plays on their own phone. Rooms have a code, link or QR. The server is authoritative, slips stay private, and reconnecting works after a refresh.
- **Cum se joacă** (`/tutorial`): a 30-second interactive demo on a mini couch.

Romanian by default, with an English toggle. Installable as a PWA.

Docs: [`design-analysis.md`](design-analysis.md) covers the visual language. [`ARCHITECTURE.md`](ARCHITECTURE.md) covers the data model, realtime and security.

## Rules (as implemented)

- 8+ players (ideally an even number) in two teams. Every player secretly gets a slip with someone's name. Getting your own name is a setting ("allow own name", off by default).
- Players sit in a circle with **exactly one empty seat**. The first *N* seats form the couch (default 4). Teams alternate around the circle and the couch starts 2 + 2.
- **The player whose right-hand seat is empty calls a name.** Whoever holds that slip moves into the empty seat.
- Optional (on by default): after moving, the mover swaps slips with the caller.
- A team wins when it holds every couch seat.

The rules are pure functions in `lib/game/engine.ts`, shared by both modes and the tutorial.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Vitest: game rules, room reducer, privacy of player views
```

Without Supabase env vars, the server uses an **in-memory store** and clients poll every second. That's enough to play online locally with zero setup.

### Test multiplayer with several tabs

Each tab must be a *different player*, and players are remembered in `localStorage`, so use separate browser profiles or windows:

1. Put `ALLOW_SMALL_ROOMS=1` in `.env.local` so a game can start with 3+ players instead of 8.
2. Window A (normal): `/online` → enter a name → **Creează cameră**.
3. Windows B and C (incognito / another browser / another profile): open the room link → join.
4. In window A: Settings → set the couch to 2 seats (it must be ≤ the larger team) → **Începe jocul**.
5. Whoever sees the green **E rândul tău** pill calls a name. Watch the move animate on every screen.

## Supabase setup (production)

1. Create a free Supabase project. Either use the Vercel integration (`vercel integration add supabase`), which injects the env vars automatically (that is how the live site is set up), or go to supabase.com → New project. Locally, `vercel env pull .env.local` brings the same vars down.
2. In the SQL editor, run [`supabase/migrations/0001_rooms.sql`](supabase/migrations/0001_rooms.sql). It creates the `rooms` table with RLS **on and no policies**, so the public key can't read it.
3. Realtime needs no setup. The server sends broadcast pings over the REST API, and clients subscribe to the public channel `room:CODE`.
4. Set the env vars (see `.env.example`):

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Realtime subscription only (pings + presence) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | read/write `rooms` from the API routes |
| `ALLOW_SMALL_ROOMS` | server | `1` lets online games start with 3+ players (testing) |

On Vercel the API refuses to run online rooms without Supabase. Mode 1 and the tutorial don't need it.

## Deploy to Vercel

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

## Project layout

```
app/                    routes + API route handlers (server-authoritative game server)
components/ui/          design system: Button, Sheet, Toggle, Stepper, Avatar, TopBar…
components/game/        RoomTable (couch + seats), SlipCard, TeamBoard, TurnTimer…
components/local/       Mode 1 steps
components/online/      lobby, game screen, sheets
lib/game/               pure rules + tests
lib/room/               room reducer (validation of every action) + player views + tests
lib/server/             store (Supabase | memory), optimistic locking, broadcast
lib/client/             API client, useRoom (realtime + presence + reconnect)
lib/i18n/               ro / en
public/sw.js            offline cache for the app shell, Mode 1 and the tutorial
scripts/icons.mjs       regenerates PWA icons
```
