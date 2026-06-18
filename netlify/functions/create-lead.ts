import type { Context } from '@netlify/functions';
import { getRepo, getDs, buildDeps, initStore, isFake } from '../../server/wiring';
import { loadConfig } from '../../server/config';
import { parseSessionCookie, newSessionId } from '../../server/session';
import { populateAgreements } from '../../server/templates/agreements';
import type { IntakeData, Lead } from '../../server/domain/types';
import type { CreateLeadResponse } from '../../src/types';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  const cfg = loadConfig();
  const body = await req.json() as { passcode: string; intake: IntakeData };
  if (body.passcode !== cfg.passcode) return new Response('forbidden', { status: 403 });
  await initStore();

  const repo = getRepo(); const deps = buildDeps();
  let sid = parseSessionCookie(req.headers.get('cookie'));
  let setCookie = '';
  if (!sid) { sid = newSessionId(); setCookie = `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`; }
  if (!(await repo.hasSession(sid))) await repo.createSession(sid);

  const lead: Lead = {
    id: 'lead-' + crypto.randomUUID(), sessionId: sid, status: 'pending',
    intake: body.intake, signed: false, paid: false, uploads: [], createdAt: deps.now(), updatedAt: deps.now(),
  };

  const ds = getDs();
  const { envelopeId } = await ds.createEnvelope({ lead, docs: populateAgreements(body.intake), signerName: body.intake.claimantName, signerEmail: body.intake.claimantEmail });
  lead.envelopeId = envelopeId;
  await repo.createLead(lead);

  const returnUrl = `${cfg.appUrl}/?signed=1&leadId=${lead.id}`;
  const { url } = await ds.createRecipientView({ envelopeId, lead, returnUrl, signerName: body.intake.claimantName, signerEmail: body.intake.claimantEmail });

  const res: CreateLeadResponse = { leadId: lead.id, signingUrl: url, fake: isFake() };
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (setCookie) headers['set-cookie'] = setCookie;
  return new Response(JSON.stringify(res), { headers });
};
