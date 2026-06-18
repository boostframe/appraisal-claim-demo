import type { Context } from '@netlify/functions';
import { getRepo, buildDeps, initStore } from '../../server/wiring';
import { handlePaymentSucceeded } from '../../server/domain/handlers';

/** Stable per lead: a second click is treated as a replay of the same event. */
export function paymentEventId(leadId: string): string { return `pay:${leadId}`; }

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const { leadId } = await req.json() as { leadId: string };
  const repo = getRepo(); const deps = buildDeps();
  const result = await handlePaymentSucceeded({ leadId, eventId: paymentEventId(leadId), raw: { source: 'simulated' } }, repo, deps);
  return new Response(JSON.stringify({ duplicate: result.duplicate, claimed: !!result.claim }), { headers: { 'content-type': 'application/json' } });
};
