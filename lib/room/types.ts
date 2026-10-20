import type { GameSettings, GameState, LogEntry, PlayerId, Team } from '@/lib/game';

export type Phase = 'lobby' | 'playing' | 'finished';

export interface TeamStyle {
  /** Empty string = use the localized default name. */
  name: string;
  color: string;
}

export interface RoomSettings extends GameSettings {
  teams: [TeamStyle, TeamStyle];
}

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  /** Private credential. Never leaves the server except to its owner on join. */
  token: string;
  avatar: number;
  team: Team | null;
  joinedAt: number;
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: PlayerId;
  players: RoomPlayer[];
  settings: RoomSettings;
  game: GameState | null;
  round: number;
  createdAt: number;
}

/* ----- what a client is allowed to see ----- */

export interface PublicPlayer {
  id: PlayerId;
  name: string;
  avatar: number;
  team: Team | null;
}

export interface PublicGame {
  seats: (PlayerId | null)[];
  couchSize: number;
  teams: Record<PlayerId, Team>;
  swapSlips: boolean;
  turn: number;
  log: LogEntry[];
  winner: Team | null;
  callerId: PlayerId;
  /** Only present once the game is over. */
  finalSlips?: Record<PlayerId, PlayerId>;
}

export interface PlayerView {
  code: string;
  version: number;
  phase: Phase;
  hostId: PlayerId;
  round: number;
  minPlayers: number;
  settings: RoomSettings;
  players: PublicPlayer[];
  meId: PlayerId;
  /** Id of the player whose name is on MY slip. Only mine, never anyone else's. */
  mySlip: PlayerId | null;
  game: PublicGame | null;
  /** Server-side presence (dev memory mode only). Supabase mode uses Realtime Presence. */
  online?: PlayerId[];
}

export interface RoomPreview {
  code: string;
  phase: Phase;
  playerCount: number;
  hostName: string;
}

export type RoomAction =
  | { type: 'leave' }
  | { type: 'kick'; playerId: PlayerId }
  | { type: 'transferHost'; playerId: PlayerId }
  | { type: 'setTeam'; playerId: PlayerId; team: Team | null }
  | { type: 'autoTeams' }
  | { type: 'settings'; patch: Partial<RoomSettings> }
  | { type: 'start' }
  | { type: 'call'; calledId: PlayerId }
  | { type: 'rematch' }
  | { type: 'toLobby' };

export const TEAM_COLORS = ['#FF6A4D', '#3AB4FF', '#3DDC97', '#F0A93B', '#FF5C8A', '#9FD8FF'] as const;

export const MAX_PLAYERS = 20;
export const NAME_MAX = 18;
