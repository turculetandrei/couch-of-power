import type { PlayerView, RoomAction, RoomPreview } from '@/lib/room/types';
import { storage } from '@/lib/storage';

export interface Session {
  token: string;
  playerId: string;
}

const key = (code: string) => `cop:room:${code}`;
export const NICK_KEY = 'cop:nick';

export const sessions = {
  get: (code: string) => storage.get<Session>(key(code)),
  set: (code: string, s: Session) => storage.set(key(code), s),
  clear: (code: string) => storage.remove(key(code)),
};

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

async function call<T>(url: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        ...(init.token ? { 'x-player-token': init.token } : {}),
      },
    });
  } catch {
    throw new ApiError('network', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? 'server_error', res.status);
  return body as T;
}

export const api = {
  create: (name: string) =>
    call<{ code: string } & Session>('/api/rooms', { method: 'POST', body: JSON.stringify({ name }) }),
  join: (code: string, name: string) =>
    call<{ code: string } & Session>(`/api/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  get: (code: string, token: string | null) =>
    call<{ view?: PlayerView; preview?: RoomPreview }>(`/api/rooms/${code}`, { token }),
  act: (code: string, token: string, action: RoomAction) =>
    call<{ view?: PlayerView; left?: boolean }>(`/api/rooms/${code}/actions`, {
      method: 'POST',
      token,
      body: JSON.stringify(action),
    }),
};
