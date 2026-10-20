import {
  GameError,
  type GameSettings,
  type GameState,
  type LogEntry,
  type PlayerId,
  type Rng,
  type Team,
} from './types';

/* ------------------------------------------------------------------ utils */

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/* ------------------------------------------------------------------ teams */

/** Random balanced split: team sizes differ by at most one. */
export function splitTeams(ids: readonly PlayerId[], rng: Rng = Math.random): Record<PlayerId, Team> {
  const out: Record<PlayerId, Team> = {};
  const offset = rng() < 0.5 ? 0 : 1;
  shuffle(ids, rng).forEach((id, i) => {
    out[id] = ((i + offset) % 2) as Team;
  });
  return out;
}

export function teamSizes(teams: Record<PlayerId, Team>): [number, number] {
  const sizes: [number, number] = [0, 0];
  for (const t of Object.values(teams)) sizes[t]++;
  return sizes;
}

/* -------------------------------------------------------------- validation */

export type SetupProblem =
  | { code: 'too_few_players'; min: number }
  | { code: 'teams_unbalanced' }
  | { code: 'bad_couch_size'; max: number }
  | { code: 'unassigned_team' };

/**
 * Everything that prevents a game from starting, so the UI can explain it.
 * - teams must differ by at most one player (otherwise teammates would have to sit together)
 * - couch size between 2 and the larger team's size (otherwise nobody can ever win)
 */
export function setupProblems(
  teams: Record<PlayerId, Team | null>,
  couchSize: number,
  minPlayers = 8,
): SetupProblem[] {
  const problems: SetupProblem[] = [];
  const ids = Object.keys(teams);
  if (ids.length < minPlayers) problems.push({ code: 'too_few_players', min: minPlayers });
  if (ids.some((id) => teams[id] !== 0 && teams[id] !== 1)) {
    problems.push({ code: 'unassigned_team' });
    return problems;
  }
  const [a, b] = teamSizes(teams as Record<PlayerId, Team>);
  if (Math.abs(a - b) > 1 || a === 0 || b === 0) problems.push({ code: 'teams_unbalanced' });
  const max = Math.max(a, b);
  if (!Number.isInteger(couchSize) || couchSize < 2 || couchSize > max || couchSize > ids.length) {
    problems.push({ code: 'bad_couch_size', max: Math.max(2, Math.min(max, ids.length)) });
  }
  return problems;
}

/* ------------------------------------------------------------------- deal */

function isDerangement(ids: readonly PlayerId[], perm: readonly PlayerId[]) {
  return ids.every((id, i) => perm[i] !== id);
}

/**
 * Deal one slip per player. Returns holder -> name on slip.
 * Without `allowOwnName` the result is a uniformly random derangement (rejection sampling;
 * expected ~e tries) so nobody holds their own name.
 */
export function dealSlips(
  ids: readonly PlayerId[],
  allowOwnName: boolean,
  rng: Rng = Math.random,
): Record<PlayerId, PlayerId> {
  if (!allowOwnName && ids.length < 2) throw new GameError('no_derangement');
  let perm = shuffle(ids, rng);
  if (!allowOwnName) {
    let tries = 0;
    while (!isDerangement(ids, perm) && tries++ < 500) perm = shuffle(ids, rng);
    if (!isDerangement(ids, perm)) {
      // Practically unreachable; Sattolo's algorithm always yields a single cycle (a derangement).
      perm = ids.slice();
      for (let i = perm.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * i);
        [perm[i], perm[j]] = [perm[j], perm[i]];
      }
    }
  }
  const slips: Record<PlayerId, PlayerId> = {};
  ids.forEach((id, i) => (slips[id] = perm[i]));
  return slips;
}

/* ---------------------------------------------------------------- seating */

/**
 * Build the circle: teams alternate, one empty seat, the couch (seats 0..couchSize-1)
 * is a full window of alternating players, so it starts balanced (2 + 2 for size 4).
 * With an odd number of players the bigger team has two members "touching" across the
 * empty seat, which is the only place the gap can go.
 */
export function arrangeSeats(
  teams: Record<PlayerId, Team>,
  couchSize: number,
  rng: Rng = Math.random,
): (PlayerId | null)[] {
  const t0 = shuffle(
    Object.keys(teams).filter((id) => teams[id] === 0),
    rng,
  );
  const t1 = shuffle(
    Object.keys(teams).filter((id) => teams[id] === 1),
    rng,
  );
  if (Math.abs(t0.length - t1.length) > 1) throw new GameError('teams_unbalanced');
  const n = t0.length + t1.length;
  if (couchSize < 2 || couchSize > n) throw new GameError('bad_couch_size');

  let [first, second] = t0.length >= t1.length ? [t0, t1] : [t1, t0];
  if (t0.length === t1.length && rng() < 0.5) [first, second] = [second, first];

  const line: (PlayerId | null)[] = [];
  for (let i = 0; i < first.length; i++) {
    line.push(first[i]);
    if (i < second.length) line.push(second[i]);
  }
  line.push(null); // empty seat at index n
  const size = n + 1;
  // Rotate so the empty seat lands somewhere off the couch: empty index p in [couchSize, n].
  const p = couchSize + Math.floor(rng() * (n - couchSize + 1));
  const r = n - p;
  return line.map((_, i) => line[mod(i + r, size)]);
}

/* ------------------------------------------------------------------ setup */

export function createGame(
  teams: Record<PlayerId, Team>,
  settings: GameSettings,
  rng: Rng = Math.random,
): GameState {
  const ids = Object.keys(teams);
  const seats = arrangeSeats(teams, settings.couchSize, rng);
  return {
    seats,
    couchSize: settings.couchSize,
    slips: dealSlips(ids, settings.allowOwnName, rng),
    teams: { ...teams },
    swapSlips: settings.swapSlips,
    turn: 0,
    log: [],
    winner: null,
  };
}

/* ---------------------------------------------------------------- queries */

export const emptySeat = (g: Pick<GameState, 'seats'>) => g.seats.indexOf(null);

/** Seat to the right of `seat`, for someone sitting in the circle facing its centre. */
export const rightOf = (seat: number, size: number) => mod(seat - 1, size);

/** The caller's seat: the one whose right-hand neighbour is empty. */
export const callerSeat = (g: Pick<GameState, 'seats'>) => mod(emptySeat(g) + 1, g.seats.length);

export const currentCaller = (g: Pick<GameState, 'seats'>): PlayerId =>
  g.seats[callerSeat(g)] as PlayerId;

export const seatOf = (g: Pick<GameState, 'seats'>, id: PlayerId) => g.seats.indexOf(id);

export const isCouchSeat = (g: Pick<GameState, 'couchSize'>, seat: number) => seat < g.couchSize;

/** How many couch seats each team holds. */
export function couchCount(g: Pick<GameState, 'seats' | 'couchSize' | 'teams'>): [number, number] {
  const c: [number, number] = [0, 0];
  for (let i = 0; i < g.couchSize; i++) {
    const id = g.seats[i];
    if (id) c[g.teams[id]]++;
  }
  return c;
}

export function checkWinner(g: Pick<GameState, 'seats' | 'couchSize' | 'teams'>): Team | null {
  const [a, b] = couchCount(g);
  if (a === g.couchSize) return 0;
  if (b === g.couchSize) return 1;
  return null;
}

export const holderOf = (g: Pick<GameState, 'slips'>, nameId: PlayerId) =>
  Object.keys(g.slips).find((h) => g.slips[h] === nameId);

/* ------------------------------------------------------------------- turn */

/**
 * The caller names a player. Whoever holds that name's slip moves into the empty seat.
 * With `swapSlips`, the mover and the caller then exchange slips.
 */
export function callName(g: GameState, callerId: PlayerId, calledId: PlayerId): GameState {
  if (g.winner !== null) throw new GameError('not_playing');
  if (currentCaller(g) !== callerId) throw new GameError('not_your_turn');
  if (!(calledId in g.teams)) throw new GameError('unknown_player');
  if (g.slips[callerId] === calledId) throw new GameError('own_slip');

  const moverId = holderOf(g, calledId);
  if (!moverId) throw new GameError('unknown_player');

  const fromSeat = seatOf(g, moverId);
  const toSeat = emptySeat(g);
  const seats = g.seats.slice();
  seats[toSeat] = moverId;
  seats[fromSeat] = null;

  const slips = { ...g.slips };
  const swapped = g.swapSlips && moverId !== callerId;
  if (swapped) [slips[moverId], slips[callerId]] = [slips[callerId], slips[moverId]];

  const entry: LogEntry = {
    turn: g.turn + 1,
    callerId,
    calledId,
    moverId,
    fromSeat,
    toSeat,
    swapped,
  };
  const next: GameState = { ...g, seats, slips, turn: g.turn + 1, log: [...g.log, entry] };
  next.winner = checkWinner(next);
  return next;
}
