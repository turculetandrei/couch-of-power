import { bodyOf, fail, ok } from '@/lib/server/http';
import { joinRoom, normalizeCode } from '@/lib/server/rooms';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = normalizeCode((await params).code);
    const { name } = await bodyOf(req);
    return ok(await joinRoom(code, name));
  } catch (e) {
    return fail(e);
  }
}
