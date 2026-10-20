export type PlayerId = string;
export type Team = 0 | 1;

/** Random source returning a float in [0, 1). Injected so tests are deterministic. */
export type Rng = () => number;

export interface LogEntry {
  turn: number;
  callerId: PlayerId;
  /** Whose name was called (the name on the slip). */
  calledId: PlayerId;
  /** Who held that slip and moved into the empty seat. */
  moverId: PlayerId;
  fromSeat: number;
  toSeat: number;
  swapped: boolean;
}

export interface GameState {
  /** Seats in clockwise order. Exactly one is `null` (the empty seat). */
  seats: (PlayerId | null)[];
  /** Seats `[0, couchSize)` form the couch. */
  couchSize: number;
  /** holder -> player whose name is written on the slip. SECRET. */
  slips: Record<PlayerId, PlayerId>;
  teams: Record<PlayerId, Team>;
  swapSlips: boolean;
  turn: number;
  log: LogEntry[];
  winner: Team | null;
}

export interface GameSettings {
  couchSize: number;
  swapSlips: boolean;
  allowOwnName: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  couchSize: 4,
  swapSlips: true,
  allowOwnName: false,
};

export class GameError extends Error {
  constructor(
    public code:
      | 'not_playing'
      | 'not_your_turn'
      | 'unknown_player'
      | 'own_slip'
      | 'too_few_players'
      | 'teams_unbalanced'
      | 'bad_couch_size'
      | 'no_derangement'
      | 'unassigned_team',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'GameError';
  }
}
