// server/domain/handlers.ts
import type { Repository } from '../repo/types';
import type { Claim, Deps, DemoEvent } from './types';
import { reconcile } from './reconcile';

async function currentClaim(leadId: string, repo: Repository): Promise<Claim | null> {
  return repo.getClaimByLead(leadId);
}

export async function handleEnvelopeCompleted(
  input: { leadId: string; eventId: string; envelopeId: string; raw: unknown },
  repo: Repository,
  deps: Deps,
  fetchPdf: (envelopeId: string) => Promise<{ blobKey: string }>,
): Promise<{ duplicate: boolean; claim: Claim | null }> {
  const ev: DemoEvent = { eventId: input.eventId, leadId: input.leadId, type: 'envelope.completed', receivedAt: deps.now(), raw: input.raw };
  const isNew = await repo.recordEvent(ev);
  if (!isNew) return { duplicate: true, claim: await currentClaim(input.leadId, repo) };

  const { blobKey } = await fetchPdf(input.envelopeId);
  await repo.updateLead(input.leadId, { signed: true, status: 'signed', pdfBlobKey: blobKey });
  const claim = await reconcile(input.leadId, repo, deps);
  return { duplicate: false, claim };
}

export async function handlePaymentSucceeded(
  input: { leadId: string; eventId: string; raw: unknown },
  repo: Repository,
  deps: Deps,
): Promise<{ duplicate: boolean; claim: Claim | null }> {
  const ev: DemoEvent = { eventId: input.eventId, leadId: input.leadId, type: 'payment.succeeded', receivedAt: deps.now(), raw: input.raw };
  const isNew = await repo.recordEvent(ev);
  if (!isNew) return { duplicate: true, claim: await currentClaim(input.leadId, repo) };

  const lead = await repo.getLead(input.leadId);
  await repo.updateLead(input.leadId, { paid: true, status: lead?.signed ? 'signed' : 'paid' });
  const claim = await reconcile(input.leadId, repo, deps);
  return { duplicate: false, claim };
}
