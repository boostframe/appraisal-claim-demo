import type { Context } from '@netlify/functions';
import { getRepo, getDs, getBlobs, buildDeps, initStore, isFake } from '../../server/wiring';
import { handleEnvelopeCompleted } from '../../server/domain/handlers';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  if (!isFake()) return new Response('forbidden', { status: 403 });
  await initStore();

  const { leadId } = await req.json() as { leadId: string };
  const repo = getRepo();
  const lead = await repo.getLead(leadId);
  if (!lead) return new Response(JSON.stringify({ error: 'lead not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  if (!lead.envelopeId) return new Response(JSON.stringify({ error: 'lead has no envelopeId' }), { status: 404, headers: { 'content-type': 'application/json' } });

  const ds = getDs();
  const blobs = getBlobs();
  const fetchPdf = async (envelopeId: string) => {
    const bytes = await ds.getCompletedPdf(envelopeId);
    const blobKey = `pdf/${leadId}`;
    await blobs.put(blobKey, bytes, 'application/pdf');
    return { blobKey };
  };

  const result = await handleEnvelopeCompleted(
    { leadId, eventId: `dev-sign:${leadId}`, envelopeId: lead.envelopeId, raw: { source: 'dev-complete-signing' } },
    repo,
    buildDeps(),
    fetchPdf,
  );

  return new Response(
    JSON.stringify({ duplicate: result.duplicate, claimed: !!result.claim }),
    { headers: { 'content-type': 'application/json' } },
  );
};
