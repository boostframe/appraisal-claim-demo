import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepository } from '../memory';
import type { Lead } from '../../domain/types';

function lead(id: string): Lead {
  return { id, sessionId: 's1', status: 'pending',
    intake: { claimantName: 'A', claimantEmail: 'a@b.c', propertyAddress: 'X', lossType: 'Fire', lossDescription: 'd' },
    signed: false, paid: false, createdAt: 't', updatedAt: 't' };
}

describe('MemoryRepository', () => {
  let repo: MemoryRepository;
  beforeEach(() => { repo = new MemoryRepository(); });

  it('stores and fetches a lead', async () => {
    await repo.createLead(lead('l1'));
    expect((await repo.getLead('l1'))?.id).toBe('l1');
    expect(await repo.getLead('nope')).toBeNull();
  });

  it('patches a lead', async () => {
    await repo.createLead(lead('l1'));
    const updated = await repo.updateLead('l1', { signed: true, status: 'signed' });
    expect(updated.signed).toBe(true);
    expect((await repo.getLead('l1'))?.status).toBe('signed');
  });

  it('records an event once (idempotency ledger)', async () => {
    const ev = { eventId: 'e1', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't', raw: {} };
    expect(await repo.recordEvent(ev)).toBe(true);
    expect(await repo.recordEvent(ev)).toBe(false);
    expect((await repo.listEvents('l1')).length).toBe(1);
  });

  it('inserts a claim once per lead and counts', async () => {
    const c = { id: 'c1', leadId: 'l1', claimNumber: 'CLM-1040', createdAt: 't' };
    expect((await repo.insertClaim(c)).claimNumber).toBe('CLM-1040');
    const again = await repo.insertClaim({ ...c, id: 'c2', claimNumber: 'CLM-9999' });
    expect(again.id).toBe('c1'); // existing returned, not duplicated
    expect(await repo.countClaims()).toBe(1);
    expect((await repo.getClaimByLead('l1'))?.id).toBe('c1');
  });
});
