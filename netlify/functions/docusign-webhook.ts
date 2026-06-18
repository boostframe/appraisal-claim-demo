import type { Context } from '@netlify/functions';
import { getRepo, getDs, getBlobs, buildDeps, initStore } from '../../server/wiring';
import { handleEnvelopeCompleted } from '../../server/domain/handlers';

export function parseConnectPayload(body: any): { envelopeId: string; status: string; eventId: string } | null {
  const envelopeId = body?.data?.envelopeId ?? body?.envelopeId;
  const status = body?.data?.envelopeSummary?.status ?? body?.status;
  // Treat completion as signalled by either the envelope status or the Connect
  // event name, so the webhook works regardless of which envelope-data fields
  // the Connect configuration includes.
  const completed = status === 'completed' || body?.event === 'envelope-completed';
  if (!envelopeId || !completed) return null;
  const when = body?.generatedDateTime ?? body?.data?.envelopeSummary?.completedDateTime ?? '';
  return { envelopeId, status: 'completed', eventId: `${envelopeId}:completed:${when}` };
}

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const raw = await req.json().catch(() => null);
  const parsed = parseConnectPayload(raw);
  if (!parsed) return new Response(JSON.stringify({ ignored: true }), { headers: { 'content-type': 'application/json' } });

  const repo = getRepo();
  const lead = await repo.getLeadByEnvelope(parsed.envelopeId);
  if (!lead) return new Response(JSON.stringify({ ignored: 'no matching lead' }), { headers: { 'content-type': 'application/json' } });

  const ds = getDs();
  const blobs = getBlobs();
  const deps = buildDeps();
  const fetchPdf = async (envelopeId: string) => {
    const bytes = await ds.getCompletedPdf(envelopeId);
    const blobKey = `pdf/${lead.id}`;
    await blobs.put(blobKey, bytes, 'application/pdf');
    return { blobKey };
  };
  const result = await handleEnvelopeCompleted(
    { leadId: lead.id, eventId: parsed.eventId, envelopeId: parsed.envelopeId, raw },
    repo,
    deps,
    fetchPdf,
  );
  return new Response(
    JSON.stringify({ duplicate: result.duplicate, claimed: !!result.claim }),
    { headers: { 'content-type': 'application/json' } },
  );
};
