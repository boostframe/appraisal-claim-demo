import { describe, it, expect, beforeAll } from 'vitest';
import { createPostgresRepository, ensureSchema } from '../postgres';
import type { Lead } from '../../domain/types';

const RUN = !!process.env.NETLIFY_DATABASE_URL;
const d = RUN ? describe : describe.skip;

function lead(id: string): Lead {
  return { id, sessionId: `sess-${id}`, status: 'pending',
    intake: { claimantName: 'A', claimantEmail: 'a@b.c', propertyAddress: 'X', lossType: 'Fire', lossDescription: 'd' },
    signed: false, paid: false, createdAt: '2026-06-17T00:00:00Z', updatedAt: '2026-06-17T00:00:00Z' };
}

d('PostgresRepository (live Neon)', () => {
  const repo = createPostgresRepository();
  beforeAll(async () => { await ensureSchema(); });

  it('round-trips a lead, event idempotency, and single claim', async () => {
    const id = `l-${Math.floor(Math.random() * 1e9)}`;
    await repo.createLead(lead(id));
    await repo.updateLead(id, { signed: true, status: 'signed' });
    expect((await repo.getLead(id))?.signed).toBe(true);

    const ev = { eventId: `e-${id}`, leadId: id, type: 'payment.succeeded' as const, receivedAt: 't', raw: {} };
    expect(await repo.recordEvent(ev)).toBe(true);
    expect(await repo.recordEvent(ev)).toBe(false);

    const c = { id: `c-${id}`, leadId: id, claimNumber: 'CLM-9000', createdAt: 't' };
    await repo.insertClaim(c);
    const dup = await repo.insertClaim({ ...c, id: `c2-${id}`, claimNumber: 'CLM-9999' });
    expect(dup.id).toBe(c.id);
  });
});
