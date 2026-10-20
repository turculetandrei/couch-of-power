import { fail, ok, tokenOf } from '@/lib/server/http';
import { getRoom, normalizeCode } from '@/lib/server/rooms';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = normalizeCode((await params).code);
    return ok(await getRoom(code, tokenOf(req)));
  } catch (e) {
    return fail(e);
  }
}
