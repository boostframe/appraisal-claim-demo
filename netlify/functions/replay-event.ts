import type { Context } from '@netlify/functions';
import { getRepo, getDs, getBlobs, buildDeps, initStore } from '../../server/wiring';
import { handlePaymentSucceeded, handleEnvelopeCompleted } from '../../server/domain/handlers';

/** Re-posts the most recent event for a lead by reusing its eventId, proving idempotency. */
export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const { leadId } = await req.json() as { leadId: string };
  const repo = getRepo(); const deps = buildDeps();
  const events = await repo.listEvents(leadId);
  const last = events[events.length - 1];
  if (!last) return new Response(JSON.stringify({ replayed: null, message: 'no events yet' }), { headers: { 'content-type': 'application/json' } });

  let result;
  if (last.type === 'payment.succeeded') {
    result = await handlePaymentSucceeded({ leadId, eventId: last.eventId, raw: last.raw }, repo, deps);
  } else {
    const lead = await repo.getLead(leadId);
    const fetchPdf = async (envelopeId: string) => {
      const bytes = await getDs().getCompletedPdf(envelopeId);
      const blobKey = `pdf/${leadId}`;
      await getBlobs().put(blobKey, bytes, 'application/pdf');
      return { blobKey };
    };
    result = await handleEnvelopeCompleted({ leadId, eventId: last.eventId, envelopeId: lead!.envelopeId!, raw: last.raw }, repo, deps, fetchPdf);
  }
  return new Response(JSON.stringify({ replayed: last.eventId, duplicate: result.duplicate }), { headers: { 'content-type': 'application/json' } });
};
