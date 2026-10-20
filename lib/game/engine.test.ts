import { describe, expect, it } from 'vitest';
import {
  arrangeSeats,
  callName,
  callerSeat,
  checkWinner,
  couchCount,
  createGame,
  currentCaller,
  dealSlips,
  emptySeat,
  holderOf,
  rightOf,
  setupProblems,
  splitTeams,
  teamSizes,
} from './engine';
import { GameError, type GameState, type Team } from './types';

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function teamsOf(n: number): Record<string, Team> {
  const t: Record<string, Team> = {};
  ids(n).forEach((id, i) => (t[id] = (i % 2) as Team));
  return t;
}

function assertNoAdjacentTeammates(seats: (string | null)[], teams: Record<string, Team>) {
  for (let i = 0; i < seats.length; i++) {
    const a = seats[i];
    const b = seats[(i + 1) % seats.length];
    if (a && b) expect(teams[a], `seats ${i} and ${i + 1}`).not.toBe(teams[b]);
  }
}

describe('splitTeams', () => {
  it.each([8, 9, 10, 13])('balances %i players (difference ≤ 1)', (n) => {
    const t = splitTeams(ids(n), seeded(n));
    const [a, b] = teamSizes(t);
    expect(a + b).toBe(n);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(1);
  });
});

describe('dealSlips', () => {
  it('gives every player exactly one slip and every name appears exactly once', () => {
    const slips = dealSlips(ids(10), true, seeded(1));
    expect(Object.keys(slips).sort()).toEqual(ids(10).sort());
    expect(Object.values(slips).sort()).toEqual(ids(10).sort());
  });

  it('never deals your own name when allowOwnName is off', () => {
    for (let s = 0; s < 300; s++) {
      const slips = dealSlips(ids(8), false, seeded(s));
      for (const [holder, name] of Object.entries(slips)) expect(name).not.toBe(holder);
    }
  });

  it('can deal your own name when allowOwnName is on', () => {
    let sawOwn = false;
    for (let s = 0; s < 200 && !sawOwn; s++) {
      const slips = dealSlips(ids(8), true, seeded(s));
      sawOwn = Object.entries(slips).some(([h, n]) => h === n);
    }
    expect(sawOwn).toBe(true);
  });

  it('works with 2 players without own name (forced swap)', () => {
    expect(dealSlips(['a', 'b'], false, seeded(3))).toEqual({ a: 'b', b: 'a' });
  });

  it('throws for a single player without own name', () => {
    expect(() => dealSlips(['a'], false)).toThrow(GameError);
  });

  it('falls back to a derangement even with a broken RNG', () => {
    const slips = dealSlips(ids(6), false, () => 0);
    for (const [h, n] of Object.entries(slips)) expect(n).not.toBe(h);
  });
});

describe('arrangeSeats', () => {
  it.each([
    [8, 4],
    [10, 4],
    [12, 6],
    [9, 4],
    [11, 5],
    [3, 2],
  ])('%i players, couch %i: one empty seat, teams alternate, couch balanced', (n, couch) => {
    for (let s = 0; s < 50; s++) {
      const teams = teamsOf(n);
      const seats = arrangeSeats(teams, couch, seeded(s * 31 + n));
      expect(seats).toHaveLength(n + 1);
      expect(seats.filter((x) => x === null)).toHaveLength(1);
      expect(new Set(seats.filter(Boolean)).size).toBe(n);
      assertNoAdjacentTeammates(seats, teams);
      // couch full and balanced at start
      const couchSeats = seats.slice(0, couch);
      expect(couchSeats.every(Boolean)).toBe(true);
      const c = couchCount({ seats, couchSize: couch, teams });
      expect(Math.abs(c[0] - c[1])).toBeLessThanOrEqual(1);
    }
  });

  it('starts the default game with 2 + 2 on the couch', () => {
    const teams = teamsOf(8);
    const seats = arrangeSeats(teams, 4, seeded(9));
    expect(couchCount({ seats, couchSize: 4, teams })).toEqual([2, 2]);
  });

  it('puts the empty seat between the two teammates when the player count is odd', () => {
    const teams = teamsOf(9); // 5 vs 4
    const seats = arrangeSeats(teams, 4, seeded(5));
    const e = seats.indexOf(null);
    const left = seats[(e - 1 + seats.length) % seats.length]!;
    const right = seats[(e + 1) % seats.length]!;
    expect(teams[left]).toBe(teams[right]);
  });

  it('rejects teams that differ by more than one', () => {
    const teams: Record<string, Team> = { a: 0, b: 0, c: 0, d: 1 };
    expect(() => arrangeSeats(teams, 2)).toThrow(GameError);
  });
});

describe('setupProblems', () => {
  it('accepts a standard 8-player game', () => {
    expect(setupProblems(teamsOf(8), 4)).toEqual([]);
  });

  it('reports too few players, honouring a lower dev minimum', () => {
    expect(setupProblems(teamsOf(6), 2).map((p) => p.code)).toContain('too_few_players');
    expect(setupProblems(teamsOf(3), 2, 3)).toEqual([]);
  });

  it('reports unbalanced teams', () => {
    const t: Record<string, Team> = { ...teamsOf(8), p1: 0, p3: 0 };
    expect(setupProblems(t, 4).map((p) => p.code)).toContain('teams_unbalanced');
  });

  it('reports a couch larger than any team (unwinnable)', () => {
    expect(setupProblems(teamsOf(8), 5).map((p) => p.code)).toContain('bad_couch_size');
    expect(setupProblems(teamsOf(8), 1).map((p) => p.code)).toContain('bad_couch_size');
  });

  it('reports players without a team', () => {
    expect(setupProblems({ ...teamsOf(8), p0: null }, 4).map((p) => p.code)).toContain(
      'unassigned_team',
    );
  });
});

/** Hand-built state: 6 seats, couch 2, seat 5 empty. */
function fixture(overrides: Partial<GameState> = {}): GameState {
  return {
    seats: ['a', 'b', 'c', 'd', 'e', null],
    couchSize: 2,
    slips: { a: 'c', b: 'e', c: 'a', d: 'b', e: 'd' },
    teams: { a: 0, b: 1, c: 0, d: 1, e: 0 },
    swapSlips: true,
    turn: 0,
    log: [],
    winner: null,
    ...overrides,
  };
}

describe('turn order', () => {
  it('right of a seat is the previous seat (clockwise indexing)', () => {
    expect(rightOf(3, 6)).toBe(2);
    expect(rightOf(0, 6)).toBe(5);
  });

  it('the caller is the player whose right-hand seat is empty', () => {
    const g = fixture();
    expect(emptySeat(g)).toBe(5);
    expect(callerSeat(g)).toBe(0);
    expect(currentCaller(g)).toBe('a');
    expect(rightOf(callerSeat(g), g.seats.length)).toBe(emptySeat(g));
  });
});

describe('callName', () => {
  it('moves the holder of the called name into the empty seat', () => {
    const g = callName(fixture(), 'a', 'd'); // e holds d
    expect(g.seats).toEqual(['a', 'b', 'c', 'd', null, 'e']);
    expect(g.turn).toBe(1);
    expect(g.log[0]).toMatchObject({ callerId: 'a', calledId: 'd', moverId: 'e', fromSeat: 4, toSeat: 5 });
  });

  it('swaps slips between mover and caller when the rule is on', () => {
    const g = callName(fixture(), 'a', 'd');
    expect(g.slips.a).toBe('d');
    expect(g.slips.e).toBe('c');
    expect(g.log[0].swapped).toBe(true);
    expect(holderOf(g, 'd')).toBe('a');
  });

  it('keeps slips when the rule is off', () => {
    const g = callName(fixture({ swapSlips: false }), 'a', 'd');
    expect(g.slips).toEqual(fixture().slips);
    expect(g.log[0].swapped).toBe(false);
  });

  it('hands the turn to the next player whose right seat is empty', () => {
    const g = callName(fixture(), 'a', 'd'); // empty is now seat 4
    expect(currentCaller(g)).toBe('e');
  });

  it('rejects a call from someone who is not the caller', () => {
    expect(() => callName(fixture(), 'b', 'd')).toThrow(/not_your_turn/);
  });

  it('rejects calling the name on your own slip', () => {
    expect(() => callName(fixture(), 'a', 'c')).toThrow(/own_slip/);
  });

  it('rejects unknown names', () => {
    expect(() => callName(fixture(), 'a', 'zz')).toThrow(/unknown_player/);
  });

  it('allows calling your own name when someone else holds it (you are not the mover)', () => {
    const g = callName(fixture(), 'a', 'a'); // c holds a
    expect(g.seats[5]).toBe('c');
  });

  it('does not mutate the input state', () => {
    const before = fixture();
    const snapshot = JSON.stringify(before);
    callName(before, 'a', 'd');
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('declares a winner when the couch is all one team, and then refuses more moves', () => {
    // couch = seats 0,1. a (team 0) sits on 0; seat 1 is empty; c (team 0) holds 'x'.
    const g0 = fixture({
      seats: ['a', null, 'b', 'c', 'd', 'e'],
      slips: { a: 'd', b: 'c', c: 'e', d: 'a', e: 'b' },
    });
    expect(currentCaller(g0)).toBe('b');
    const g1 = callName(g0, 'b', 'e'); // c holds e -> c moves to seat 1
    expect(g1.seats.slice(0, 2)).toEqual(['a', 'c']);
    expect(g1.winner).toBe(0);
    expect(() => callName(g1, currentCaller(g1), 'a')).toThrow(/not_playing/);
  });

  it('no winner while a couch seat is empty', () => {
    expect(checkWinner(fixture({ seats: ['a', null, 'b', 'c', 'd', 'e'] }))).toBeNull();
  });
});

describe('full random games', () => {
  it('always keeps one empty seat and consistent slips, and eventually can end', () => {
    for (let s = 0; s < 30; s++) {
      const rng = seeded(1000 + s);
      const teams = splitTeams(ids(9), rng);
      let g = createGame(teams, { couchSize: 4, swapSlips: s % 2 === 0, allowOwnName: s % 3 === 0 }, rng);
      for (let i = 0; i < 400 && g.winner === null; i++) {
        const caller = currentCaller(g);
        const options = Object.keys(g.teams).filter((id) => g.slips[caller] !== id);
        g = callName(g, caller, options[Math.floor(rng() * options.length)]);
        expect(g.seats.filter((x) => x === null)).toHaveLength(1);
        expect(Object.values(g.slips).sort()).toEqual(Object.keys(g.teams).sort());
      }
      if (g.winner !== null) expect(couchCount(g)[g.winner]).toBe(4);
    }
  });
});
