import 'server-only';
import { NextResponse } from 'next/server';
import { RoomError } from '@/lib/room/reducer';

const NO_STORE = { 'cache-control': 'no-store' };

export const ok = (body: unknown) => NextResponse.json(body, { headers: NO_STORE });

export function fail(e: unknown) {
  if (e instanceof RoomError) {
    return NextResponse.json({ error: e.code }, { status: e.status, headers: NO_STORE });
  }
  console.error(e);
  return NextResponse.json({ error: 'server_error' }, { status: 500, headers: NO_STORE });
}

export const tokenOf = (req: Request) => req.headers.get('x-player-token');

export async function bodyOf(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}
