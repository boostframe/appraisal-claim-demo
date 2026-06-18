import type { Context } from '@netlify/functions';
import { getRepo, getDs, initStore } from '../../server/wiring';
import { loadConfig } from '../../server/config';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const { leadId } = await req.json() as { leadId: string };
  const repo = getRepo(); const lead = await repo.getLead(leadId);
  if (!lead || !lead.envelopeId) return new Response('not found', { status: 404 });
  const cfg = loadConfig();
  const returnUrl = `${cfg.appUrl}/?signed=1&leadId=${lead.id}`;
  const { url } = await getDs().createRecipientView({ envelopeId: lead.envelopeId, lead, returnUrl, signerName: lead.intake.claimantName, signerEmail: lead.intake.claimantEmail });
  return new Response(JSON.stringify({ signingUrl: url }), { headers: { 'content-type': 'application/json' } });
};
