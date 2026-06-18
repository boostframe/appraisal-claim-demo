// server/docusign/__tests__/fake.test.ts
import { describe, it, expect } from 'vitest';
import { FakeDocuSign } from '../fake';
import type { Lead } from '../../domain/types';

const lead: Lead = { id: 'l1', sessionId: 's1', status: 'pending',
  intake: { claimantName: 'A', claimantEmail: 'a@b.c', propertyAddress: 'X', lossType: 'Fire', lossDescription: 'd' },
  signed: false, paid: false, createdAt: 't', updatedAt: 't' };

describe('FakeDocuSign', () => {
  it('creates an envelope and returns a recipient view url and a pdf', async () => {
    const ds = new FakeDocuSign();
    const { envelopeId } = await ds.createEnvelope({ lead, docs: [], signerName: 'A', signerEmail: 'a@b.c' });
    expect(envelopeId).toMatch(/^fake-env-/);
    const { url } = await ds.createRecipientView({ envelopeId, lead, returnUrl: 'http://x/return', signerName: 'A', signerEmail: 'a@b.c' });
    expect(url).toContain(envelopeId);
    const pdf = await ds.getCompletedPdf(envelopeId);
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
