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

  it('listEvents returns defensive copies (mutation does not corrupt store)', async () => {
    const ev = { eventId: 'e1', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't', raw: {} };
    await repo.recordEvent(ev);

    const [first] = await repo.listEvents('l1');
    // Mutate the returned object
    (first as any).type = 'MUTATED';

    // A second call must still return the original value
    const [second] = await repo.listEvents('l1');
    expect(second.type).toBe('payment.succeeded');
  });

  it('resetSession clears all leads, events, and claims for a session without touching other sessions', async () => {
    // Session 1 — lead with two events and a claim
    const l1 = { ...lead('l1'), sessionId: 's1' };
    await repo.createLead(l1);
    const ev1 = { eventId: 'e1', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't', raw: {} };
    const ev2 = { eventId: 'e2', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't2', raw: {} };
    await repo.recordEvent(ev1);
    await repo.recordEvent(ev2);
    await repo.insertClaim({ id: 'c1', leadId: 'l1', claimNumber: 'CLM-1', createdAt: 't' });

    // Session 2 — independent lead
    const l2 = { ...lead('l2'), sessionId: 's2' };
    await repo.createLead(l2);

    // Reset only session 1
    await repo.resetSession('s1');

    // Session 1 data must be gone
    expect(await repo.getLead('l1')).toBeNull();
    expect(await repo.getClaimByLead('l1')).toBeNull();
    expect(await repo.listEvents('l1')).toHaveLength(0);
    expect(await repo.countClaims()).toBe(0);

    // Session 2 lead must survive
    expect((await repo.getLead('l2'))?.id).toBe('l2');
  });
});
