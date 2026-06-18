// server/domain/reconcile.ts
import type { Repository } from '../repo/types';
import type { Claim, Deps } from './types';

const CLAIM_BASE = 1040;

export async function createClaim(leadId: string, repo: Repository, deps: Deps): Promise<Claim> {
  const lead = await repo.getLead(leadId);
  if (!lead) throw new Error(`lead ${leadId} not found`);
  if (!lead.signed || !lead.paid) {
    throw new Error('cannot create claim before both signature and payment have succeeded');
  }
  const existing = await repo.getClaimByLead(leadId);
  if (existing) return existing;

  const claimNumber = `CLM-${CLAIM_BASE + (await repo.countClaims())}`;
  const claim: Claim = {
    id: deps.genId(), leadId, claimNumber, pdfBlobKey: lead.pdfBlobKey, createdAt: deps.now(),
  };
  const inserted = await repo.insertClaim(claim);
  await repo.updateLead(leadId, { status: 'claimed' });
  return inserted;
}

/** The only path to a claim. Fires only when both gates are true. */
export async function reconcile(leadId: string, repo: Repository, deps: Deps): Promise<Claim | null> {
  const lead = await repo.getLead(leadId);
  if (!lead) return null;
  if (lead.signed && lead.paid) return createClaim(leadId, repo, deps);
  return null;
}
