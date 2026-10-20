import type { RoomAction } from '@/lib/room/types';
import { bodyOf, fail, ok, tokenOf } from '@/lib/server/http';
import { act, normalizeCode } from '@/lib/server/rooms';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = normalizeCode((await params).code);
    const action = (await bodyOf(req)) as unknown as RoomAction;
    return ok(await act(code, tokenOf(req), action));
  } catch (e) {
    return fail(e);
  }
}
