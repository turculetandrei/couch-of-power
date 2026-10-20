import { describe, expect, it } from 'vitest';
import { addPlayer, applyAction, cleanName, newRoom, toPlayerView } from './reducer';
import type { RoomPlayer, RoomState } from './types';

const player = (i: number): RoomPlayer => ({
  id: `p${i}`,
  name: `Player ${i}`,
  token: `secret-token-${i}`,
  avatar: i,
  team: null,
  joinedAt: i,
});

function lobby(n: number): RoomState {
  let s = newRoom('ABCDE', player(0));
  for (let i = 1; i < n; i++) s = addPlayer(s, player(i));
  return s;
}

const ctx = { minPlayers: 8 };

function started(n = 8): RoomState {
  let s = applyAction(lobby(n), 'p0', { type: 'autoTeams' }, ctx);
  s = applyAction(s, 'p0', { type: 'start' }, ctx);
  return s;
}

describe('room lobby', () => {
  it('rejects duplicate names case-insensitively', () => {
    expect(() => addPlayer(lobby(2), { ...player(5), name: 'player 1' })).toThrow(/name_taken/);
  });

  it('cleans names', () => {
    expect(cleanName('  Ana   Maria  ')).toBe('Ana Maria');
    expect(cleanName('<b>x</b>')).toBe('bx/b');
    expect(cleanName('   ')).toBeNull();
    expect(cleanName(42)).toBeNull();
  });

  it('only the host can change settings or start', () => {
    const s = lobby(8);
    expect(() => applyAction(s, 'p1', { type: 'start' }, ctx)).toThrow(/not_host/);
    expect(() => applyAction(s, 'p1', { type: 'settings', patch: { couchSize: 2 } }, ctx)).toThrow(/not_host/);
  });

  it('refuses to start with too few players unless the minimum is lowered', () => {
    const s = applyAction(lobby(4), 'p0', { type: 'autoTeams' }, ctx);
    expect(() => applyAction(s, 'p0', { type: 'start' }, ctx)).toThrow(/setup_invalid/);
    const s2 = applyAction(s, 'p0', { type: 'settings', patch: { couchSize: 2 } }, ctx);
    expect(applyAction(s2, 'p0', { type: 'start' }, { minPlayers: 3 }).phase).toBe('playing');
  });

  it('refuses joins after the game started', () => {
    expect(() => addPlayer(started(), player(20))).toThrow(/game_in_progress/);
  });

  it('transfers host when the host leaves', () => {
    const s = applyAction(lobby(3), 'p0', { type: 'leave' }, ctx);
    expect(s.hostId).toBe('p1');
  });

  it('kicking mid-game returns everyone to the lobby', () => {
    const s = applyAction(started(), 'p0', { type: 'kick', playerId: 'p3' }, ctx);
    expect(s.phase).toBe('lobby');
    expect(s.players.map((p) => p.id)).not.toContain('p3');
  });

  it('rejects unknown actors', () => {
    expect(() => applyAction(lobby(2), 'nobody', { type: 'leave' }, ctx)).toThrow(/unauthorized/);
  });
});

describe('room game', () => {
  it('only the current caller may call', () => {
    const s = started();
    const caller = s.game!.seats[(s.game!.seats.indexOf(null) + 1) % s.game!.seats.length]!;
    const other = s.players.find((p) => p.id !== caller)!.id;
    const name = s.players.find((p) => s.game!.slips[caller] !== p.id)!.id;
    expect(() => applyAction(s, other, { type: 'call', calledId: name }, ctx)).toThrow(/not_your_turn/);
    expect(applyAction(s, caller, { type: 'call', calledId: name }, ctx).game!.turn).toBe(1);
  });
});

describe('toPlayerView (privacy)', () => {
  it('never includes other players’ slips or anyone’s token', () => {
    const s = started();
    for (const p of s.players) {
      const view = toPlayerView(s, p.id, 1, 8);
      const json = JSON.stringify(view);
      expect(json).not.toContain('secret-token');
      expect(view.mySlip).toBe(s.game!.slips[p.id]);
      expect(view.game).not.toHaveProperty('slips');
      expect(view.game!.finalSlips).toBeUndefined();
      // No other mapping holder->slip is derivable from the view
      expect(Object.keys(view)).not.toContain('slips');
    }
  });

  it('reveals all slips only after the game is won', () => {
    const s = started();
    const won: RoomState = { ...s, phase: 'finished', game: { ...s.game!, winner: 0 } };
    expect(toPlayerView(won, 'p0', 1, 8).game!.finalSlips).toEqual(s.game!.slips);
  });
});
