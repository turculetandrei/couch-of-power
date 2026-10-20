import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RoomState } from '@/lib/room/types';

export interface StoredRoom {
  state: RoomState;
  version: number;
}

export interface RoomStore {
  kind: 'supabase' | 'memory';
  get(code: string): Promise<StoredRoom | null>;
  /** Returns false if the code is taken. */
  create(state: RoomState): Promise<boolean>;
  /** Optimistic write. Returns the new version, or null if `expected` is stale. */
  update(code: string, state: RoomState, expected: number): Promise<number | null>;
  /** Tell subscribers that a room changed. Payload never contains state. */
  notify(code: string, version: number): Promise<void>;
  /** Dev-only presence. */
  touch?(code: string, playerId: string): void;
  online?(code: string): string[];
}

/* ------------------------------------------------------------- supabase */

class SupabaseStore implements RoomStore {
  kind = 'supabase' as const;
  private db: SupabaseClient;

  constructor(
    private url: string,
    private serviceKey: string,
  ) {
    this.db = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async get(code: string) {
    const { data, error } = await this.db
      .from('rooms')
      .select('state, version')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data as StoredRoom | null;
  }

  async create(state: RoomState) {
    const { error } = await this.db.from('rooms').insert({ code: state.code, state, version: 1 });
    if (error?.code === '23505') return false;
    if (error) throw error;
    return true;
  }

  async update(code: string, state: RoomState, expected: number) {
    const { data, error } = await this.db
      .from('rooms')
      .update({ state, version: expected + 1, updated_at: new Date().toISOString() })
      .eq('code', code)
      .eq('version', expected)
      .select('version');
    if (error) throw error;
    return data?.length ? expected + 1 : null;
  }

  async notify(code: string, version: number) {
    // Realtime broadcast over REST: no socket needed inside a serverless function.
    const res = await fetch(`${this.url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: this.serviceKey,
        authorization: `Bearer ${this.serviceKey}`,
      },
      body: JSON.stringify({
        messages: [{ topic: `room:${code}`, event: 'v', payload: { v: version } }],
      }),
    }).catch(() => null);
    if (res && !res.ok) console.warn('[realtime] broadcast failed', res.status);
  }
}

/* --------------------------------------------------------------- memory */

interface MemoryDb {
  rooms: Map<string, StoredRoom>;
  seen: Map<string, Map<string, number>>;
}

const g = globalThis as unknown as { __copMemory?: MemoryDb };

class MemoryStore implements RoomStore {
  kind = 'memory' as const;
  private db: MemoryDb = (g.__copMemory ??= { rooms: new Map(), seen: new Map() });

  async get(code: string) {
    const r = this.db.rooms.get(code);
    return r ? structuredClone(r) : null;
  }
  async create(state: RoomState) {
    if (this.db.rooms.has(state.code)) return false;
    this.db.rooms.set(state.code, { state: structuredClone(state), version: 1 });
    return true;
  }
  async update(code: string, state: RoomState, expected: number) {
    const r = this.db.rooms.get(code);
    if (!r || r.version !== expected) return null;
    this.db.rooms.set(code, { state: structuredClone(state), version: expected + 1 });
    return expected + 1;
  }
  async notify() {}
  touch(code: string, playerId: string) {
    let m = this.db.seen.get(code);
    if (!m) this.db.seen.set(code, (m = new Map()));
    m.set(playerId, Date.now());
  }
  online(code: string) {
    const m = this.db.seen.get(code);
    if (!m) return [];
    const cutoff = Date.now() - 5000;
    return [...m].filter(([, t]) => t > cutoff).map(([id]) => id);
  }
}

/* --------------------------------------------------------------- choose */

let store: RoomStore | null = null;

export function getStore(): RoomStore {
  if (store) return store;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    store = new SupabaseStore(url, key);
  } else if (process.env.VERCEL) {
    throw new Error(
      'Online rooms need Supabase. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  } else {
    console.info('[store] Supabase env missing: using the in-memory dev store.');
    store = new MemoryStore();
  }
  return store;
}

export function minPlayers(): number {
  const flag = process.env.ALLOW_SMALL_ROOMS;
  return flag === '1' || flag === 'true' ? 3 : 8;
}
