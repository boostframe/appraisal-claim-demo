import type { Context } from '@netlify/functions';

// Validates the access code against DEMO_PASSCODE so the splash is a real gate,
// not just a client-side dismiss. create-lead re-checks server-side too (defense in depth).
export default async (req: Request, _ctx: Context): Promise<Response> => {
  const body = await req.json().catch(() => ({} as any));
  const expected = process.env.DEMO_PASSCODE ?? 'appraise';
  const ok = typeof body?.passcode === 'string' && body.passcode === expected;
  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { 'content-type': 'application/json' },
  });
};
