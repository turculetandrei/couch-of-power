import {
  DEFAULT_SETTINGS,
  GameError,
  callName,
  createGame,
  currentCaller,
  setupProblems,
  splitTeams,
  type PlayerId,
  type Rng,
  type Team,
} from '@/lib/game';
import {
  MAX_PLAYERS,
  NAME_MAX,
  TEAM_COLORS,
  type PlayerView,
  type RoomAction,
  type RoomPlayer,
  type RoomPreview,
  type RoomSettings,
  type RoomState,
} from './types';

export type RoomErrorCode =
  | 'not_found'
  | 'unauthorized'
  | 'not_host'
  | 'wrong_phase'
  | 'bad_name'
  | 'name_taken'
  | 'room_full'
  | 'game_in_progress'
  | 'bad_request'
  | 'setup_invalid'
  | 'conflict'
  | GameError['code'];

export class RoomError extends Error {
  constructor(
    public code: RoomErrorCode,
    public status = 400,
  ) {
    super(code);
    this.name = 'RoomError';
  }
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  ...DEFAULT_SETTINGS,
  teams: [
    { name: '', color: TEAM_COLORS[0] },
    { name: '', color: TEAM_COLORS[1] },
  ],
};

/** Trim, collapse whitespace, strip control chars. Returns null if unusable. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
  return name.length ? name : null;
}

export function newRoom(code: string, host: RoomPlayer, now = Date.now()): RoomState {
  return {
    code,
    phase: 'lobby',
    hostId: host.id,
    players: [{ ...host, team: host.team ?? 0 }],
    settings: structuredClone(DEFAULT_ROOM_SETTINGS),
    game: null,
    round: 0,
    createdAt: now,
  };
}

export function addPlayer(state: RoomState, player: RoomPlayer): RoomState {
  if (state.phase !== 'lobby') throw new RoomError('game_in_progress', 409);
  if (state.players.length >= MAX_PLAYERS) throw new RoomError('room_full', 409);
  const lower = player.name.toLocaleLowerCase('ro');
  if (state.players.some((p) => p.name.toLocaleLowerCase('ro') === lower)) {
    throw new RoomError('name_taken', 409);
  }
  // Newcomers join the smaller team; the host can still move them.
  const sizes = [0, 1].map((t) => state.players.filter((p) => p.team === t).length);
  const team = player.team ?? (sizes[0] <= sizes[1] ? 0 : 1);
  return { ...state, players: [...state.players, { ...player, team }] };
}

const isTeam = (t: unknown): t is Team => t === 0 || t === 1;

function removePlayer(state: RoomState, id: PlayerId): RoomState {
  const players = state.players.filter((p) => p.id !== id);
  let hostId = state.hostId;
  if (hostId === id && players.length) hostId = players[0].id;
  // A player leaving mid-game breaks the circle; send everyone back to the lobby.
  const midGame = state.phase !== 'lobby';
  return {
    ...state,
    players,
    hostId,
    phase: midGame ? 'lobby' : state.phase,
    game: midGame ? null : state.game,
  };
}

function sanitizeSettings(current: RoomSettings, patch: Partial<RoomSettings>): RoomSettings {
  const next = structuredClone(current);
  if (patch.couchSize !== undefined) {
    const n = Number(patch.couchSize);
    if (!Number.isInteger(n) || n < 2 || n > 10) throw new RoomError('bad_request');
    next.couchSize = n;
  }
  if (patch.swapSlips !== undefined) next.swapSlips = !!patch.swapSlips;
  if (patch.allowOwnName !== undefined) next.allowOwnName = !!patch.allowOwnName;
  if (patch.teams !== undefined) {
    if (!Array.isArray(patch.teams) || patch.teams.length !== 2) throw new RoomError('bad_request');
    next.teams = patch.teams.map((t, i) => ({
      name: typeof t?.name === 'string' ? (cleanName(t.name) ?? '') : current.teams[i].name,
      color: (TEAM_COLORS as readonly string[]).includes(t?.color) ? t.color : current.teams[i].color,
    })) as RoomSettings['teams'];
    if (next.teams[0].color === next.teams[1].color) throw new RoomError('bad_request');
  }
  return next;
}

function startGame(state: RoomState, minPlayers: number, rng: Rng): RoomState {
  const teams: Record<PlayerId, Team | null> = {};
  for (const p of state.players) teams[p.id] = p.team;
  const problems = setupProblems(teams, state.settings.couchSize, minPlayers);
  if (problems.length) throw new RoomError('setup_invalid');
  const game = createGame(teams as Record<PlayerId, Team>, state.settings, rng);
  return { ...state, phase: 'playing', game, round: state.round + 1 };
}

export interface ActionContext {
  minPlayers: number;
  rng?: Rng;
}

/** Validate and apply one action. Pure: returns a new state or throws RoomError. */
export function applyAction(
  state: RoomState,
  actorId: PlayerId,
  action: RoomAction,
  ctx: ActionContext,
): RoomState {
  const rng = ctx.rng ?? Math.random;
  const actor = state.players.find((p) => p.id === actorId);
  if (!actor) throw new RoomError('unauthorized', 401);
  const isHost = state.hostId === actorId;
  const needHost = () => {
    if (!isHost) throw new RoomError('not_host', 403);
  };
  const needPhase = (...phases: RoomState['phase'][]) => {
    if (!phases.includes(state.phase)) throw new RoomError('wrong_phase', 409);
  };
  const target = (id: unknown) => {
    const p = state.players.find((x) => x.id === id);
    if (!p) throw new RoomError('unknown_player');
    return p;
  };

  switch (action?.type) {
    case 'leave':
      return removePlayer(state, actorId);

    case 'kick': {
      needHost();
      const p = target(action.playerId);
      if (p.id === actorId) throw new RoomError('bad_request');
      return removePlayer(state, p.id);
    }

    case 'transferHost': {
      needHost();
      return { ...state, hostId: target(action.playerId).id };
    }

    case 'setTeam': {
      needHost();
      needPhase('lobby');
      const p = target(action.playerId);
      const team = action.team === null ? null : isTeam(action.team) ? action.team : undefined;
      if (team === undefined) throw new RoomError('bad_request');
      return {
        ...state,
        players: state.players.map((x) => (x.id === p.id ? { ...x, team } : x)),
      };
    }

    case 'autoTeams': {
      needHost();
      needPhase('lobby');
      const teams = splitTeams(
        state.players.map((p) => p.id),
        rng,
      );
      return { ...state, players: state.players.map((p) => ({ ...p, team: teams[p.id] })) };
    }

    case 'settings': {
      needHost();
      needPhase('lobby');
      return { ...state, settings: sanitizeSettings(state.settings, action.patch ?? {}) };
    }

    case 'start':
      needHost();
      needPhase('lobby');
      return startGame(state, ctx.minPlayers, rng);

    case 'rematch':
      needHost();
      needPhase('playing', 'finished');
      return startGame({ ...state, phase: 'lobby', game: null }, ctx.minPlayers, rng);

    case 'toLobby':
      needHost();
      needPhase('playing', 'finished');
      return { ...state, phase: 'lobby', game: null };

    case 'call': {
      needPhase('playing');
      if (!state.game) throw new RoomError('wrong_phase', 409);
      try {
        const game = callName(state.game, actorId, String(action.calledId));
        return { ...state, game, phase: game.winner === null ? 'playing' : 'finished' };
      } catch (e) {
        if (e instanceof GameError) throw new RoomError(e.code, e.code === 'not_your_turn' ? 403 : 400);
        throw e;
      }
    }

    default:
      throw new RoomError('bad_request');
  }
}

/** The ONLY function that turns server state into something a client may receive. */
export function toPlayerView(
  state: RoomState,
  meId: PlayerId,
  version: number,
  minPlayers: number,
): PlayerView {
  const g = state.game;
  return {
    code: state.code,
    version,
    phase: state.phase,
    hostId: state.hostId,
    round: state.round,
    minPlayers,
    settings: state.settings,
    players: state.players.map(({ id, name, avatar, team }) => ({ id, name, avatar, team })),
    meId,
    mySlip: g?.slips[meId] ?? null,
    game: g
      ? {
          seats: g.seats,
          couchSize: g.couchSize,
          teams: g.teams,
          swapSlips: g.swapSlips,
          turn: g.turn,
          log: g.log,
          winner: g.winner,
          callerId: currentCaller(g),
          ...(g.winner !== null ? { finalSlips: g.slips } : {}),
        }
      : null,
  };
}

export function toPreview(state: RoomState): RoomPreview {
  return {
    code: state.code,
    phase: state.phase,
    playerCount: state.players.length,
    hostName: state.players.find((p) => p.id === state.hostId)?.name ?? '',
  };
}
