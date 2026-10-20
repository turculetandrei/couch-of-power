'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerView, RoomAction, RoomPreview } from '@/lib/room/types';
import { ApiError, api, sessions, type Session } from './api';
import { realtimeClient } from './realtime';

export type Conn = 'connecting' | 'live' | 'reconnecting' | 'offline';
export type RoomStatus = 'loading' | 'ready' | 'join' | 'notfound' | 'kicked' | 'left' | 'error';

/**
 * Keeps this player's view of a room fresh.
 * Realtime (Supabase) only delivers "version changed" pings; the view itself is always
 * fetched over HTTPS with the player's token, so secrets never travel on a shared channel.
 */
export function useRoom(code: string) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<PlayerView | null>(null);
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [status, setStatus] = useState<RoomStatus>('loading');
  const [conn, setConn] = useState<Conn>('connecting');
  const [online, setOnline] = useState<Set<string> | null>(null);
  const version = useRef(0);
  const inflight = useRef(false);
  const again = useRef(false);

  useEffect(() => setSession(sessions.get(code)), [code]);

  const accept = useCallback((v: PlayerView) => {
    if (v.version < version.current) return; // stale response
    version.current = v.version;
    setView(v);
    setStatus('ready');
    if (v.online) setOnline(new Set(v.online));
  }, []);

  const refresh = useCallback(async () => {
    if (session === undefined) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    try {
      const res = await api.get(code, session?.token ?? null);
      if (res.view) accept(res.view);
      else if (res.preview) {
        setPreview(res.preview);
        if (session) {
          // Our token no longer maps to a player: we were removed.
          sessions.clear(code);
          setSession(null);
          setView(null);
          setStatus('kicked');
        } else setStatus((s) => (s === 'kicked' ? s : 'join'));
      }
      setConn((c) => (c === 'offline' ? c : realtimeClient() ? c : 'live'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setStatus('notfound');
      else if (e instanceof ApiError && e.code === 'network') setConn('reconnecting');
      else setStatus((s) => (s === 'loading' ? 'error' : s));
    } finally {
      inflight.current = false;
      if (again.current) {
        again.current = false;
        void refresh();
      }
    }
  }, [code, session, accept]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime pings + presence, or polling in dev memory mode.
  useEffect(() => {
    if (session === undefined) return;
    const rt = realtimeClient();
    if (!rt) {
      const id = setInterval(() => {
        if (!document.hidden) void refresh();
      }, 1000);
      return () => clearInterval(id);
    }
    const channel = rt.channel(`room:${code}`, {
      config: { broadcast: { self: false }, presence: { key: session?.playerId ?? `guest-${Math.random()}` } },
    });
    channel
      .on('broadcast', { event: 'v' }, ({ payload }) => {
        if (typeof payload?.v === 'number' && payload.v > version.current) void refresh();
      })
      .on('presence', { event: 'sync' }, () => {
        setOnline(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setConn('live');
          if (session) void channel.track({ at: Date.now() });
          void refresh(); // catch anything missed while connecting
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setConn('reconnecting');
        else if (s === 'CLOSED') setConn('connecting');
      });
    const safety = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    return () => {
      clearInterval(safety);
      void rt.removeChannel(channel);
    };
  }, [code, session, refresh]);

  // Network + visibility.
  useEffect(() => {
    const goOnline = () => {
      setConn(realtimeClient() ? 'reconnecting' : 'live');
      void refresh();
    };
    const goOffline = () => setConn('offline');
    const onVis = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    document.addEventListener('visibilitychange', onVis);
    if (!navigator.onLine) setConn('offline');
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const join = useCallback(
    async (name: string) => {
      const res = await api.join(code, name);
      const s = { token: res.token, playerId: res.playerId };
      sessions.set(code, s);
      setStatus('loading');
      setSession(s);
    },
    [code],
  );

  /** Send an action. Resolves to an error code, or null on success. */
  const act = useCallback(
    async (action: RoomAction): Promise<string | null> => {
      if (!session) return 'unauthorized';
      try {
        const res = await api.act(code, session.token, action);
        if (res.left) {
          sessions.clear(code);
          setSession(null);
          setView(null);
          setStatus('left');
        } else if (res.view) accept(res.view);
        return null;
      } catch (e) {
        const err = e instanceof ApiError ? e.code : 'server_error';
        if (err === 'unauthorized') {
          sessions.clear(code);
          setSession(null);
          setStatus('kicked');
        }
        void refresh();
        return err;
      }
    },
    [code, session, accept, refresh],
  );

  return { status, view, preview, conn, online, join, act, refresh };
}
