import type { Context } from '@netlify/functions';
import { getRepo, initStore } from '../../server/wiring';
import type { StateResponse } from '../../src/types';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const leadId = new URL(req.url).searchParams.get('leadId');
  const repo = getRepo();
  if (!leadId) return new Response(JSON.stringify({ lead: null, events: [], claim: null } satisfies StateResponse), { headers: { 'content-type': 'application/json' } });
  const lead = await repo.getLead(leadId);
  const events = await repo.listEvents(leadId);
  const claim = await repo.getClaimByLead(leadId);
  const res: StateResponse = {
    lead: lead ? { id: lead.id, status: lead.status, signed: lead.signed, paid: lead.paid } : null,
    events: events.map(e => ({ eventId: e.eventId, type: e.type, receivedAt: e.receivedAt })),
    claim: claim ? { claimNumber: claim.claimNumber, createdAt: claim.createdAt, pdfUrl: `/api/get-pdf?leadId=${leadId}` } : null,
  };
  return new Response(JSON.stringify(res), { headers: { 'content-type': 'application/json' } });
};
