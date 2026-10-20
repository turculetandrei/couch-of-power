import { bodyOf, fail, ok } from '@/lib/server/http';
import { createRoom } from '@/lib/server/rooms';

export async function POST(req: Request) {
  try {
    const { name } = await bodyOf(req);
    return ok(await createRoom(name));
  } catch (e) {
    return fail(e);
  }
}
