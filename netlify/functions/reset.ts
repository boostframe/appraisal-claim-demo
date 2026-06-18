import type { Context } from '@netlify/functions';
import { getRepo, initStore } from '../../server/wiring';
import { parseSessionCookie } from '../../server/session';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const sid = parseSessionCookie(req.headers.get('cookie'));
  if (sid) await getRepo().resetSession(sid);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
