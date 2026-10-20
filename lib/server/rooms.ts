import 'server-only';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  RoomError,
  addPlayer,
  applyAction,
  cleanName,
  newRoom,
  toPlayerView,
  toPreview,
} from '@/lib/room/reducer';
import type { RoomAction, RoomPlayer, RoomState } from '@/lib/room/types';
import { getStore, minPlayers, type StoredRoom } from './store';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;

export const normalizeCode = (raw: string) => {
  const code = raw.toUpperCase().trim();
  if (!CODE_RE.test(code)) throw new RoomError('not_found', 404);
  return code;
};

const makeCode = () =>
  Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

const secureRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

function makePlayer(name: string): RoomPlayer {
  return {
    id: randomBytes(6).toString('base64url'),
    name,
    token: randomBytes(32).toString('base64url'),
    avatar: randomInt(1_000_000),
    team: null,
    joinedAt: Date.now(),
  };
}

function findByToken(state: RoomState, token: string | null) {
  if (!token) return null;
  const a = Buffer.from(token);
  return (
    state.players.find((p) => {
      const b = Buffer.from(p.token);
      return a.length === b.length && timingSafeEqual(a, b);
    }) ?? null
  );
}

async function load(code: string): Promise<StoredRoom> {
  const room = await getStore().get(code);
  if (!room) throw new RoomError('not_found', 404);
  return room;
}

/** Read-modify-write with optimistic locking; retries on concurrent writes. */
async function mutate(
  code: string,
  fn: (state: RoomState) => RoomState,
): Promise<{ state: RoomState; version: number }> {
  const store = getStore();
  for (let attempt = 0; attempt < 4; attempt++) {
    const { state, version } = await load(code);
    const next = fn(state);
    const v = await store.update(code, next, version);
    if (v !== null) {
      await store.notify(code, v);
      return { state: next, version: v };
    }
  }
  throw new RoomError('conflict', 409);
}

export async function createRoom(rawName: unknown) {
  const name = cleanName(rawName);
  if (!name) throw new RoomError('bad_name');
  const host = makePlayer(name);
  const store = getStore();
  for (let i = 0; i < 8; i++) {
    const code = makeCode();
    if (await store.create(newRoom(code, host))) {
      return { code, token: host.token, playerId: host.id };
    }
  }
  throw new RoomError('conflict', 503);
}

export async function joinRoom(code: string, rawName: unknown) {
  const name = cleanName(rawName);
  if (!name) throw new RoomError('bad_name');
  const player = makePlayer(name);
  await mutate(code, (s) => addPlayer(s, player));
  return { code, token: player.token, playerId: player.id };
}

export async function getRoom(code: string, token: string | null) {
  const store = getStore();
  const { state, version } = await load(code);
  const me = findByToken(state, token);
  if (!me) return { preview: toPreview(state) };
  store.touch?.(code, me.id);
  const view = toPlayerView(state, me.id, version, minPlayers());
  if (store.online) view.online = store.online(code);
  return { view };
}

export async function act(code: string, token: string | null, action: RoomAction) {
  let meId = '';
  const { state, version } = await mutate(code, (s) => {
    const me = findByToken(s, token);
    if (!me) throw new RoomError('unauthorized', 401);
    meId = me.id;
    return applyAction(s, me.id, action, { minPlayers: minPlayers(), rng: secureRng });
  });
  if (action.type === 'leave' || !state.players.some((p) => p.id === meId)) return { left: true };
  return { view: toPlayerView(state, meId, version, minPlayers()) };
}
