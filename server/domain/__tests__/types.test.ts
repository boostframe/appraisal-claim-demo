import { describe, it, expect } from 'vitest';
import type { Lead } from '../types';
describe('domain types', () => {
  it('builds a pending lead literal', () => {
    const lead: Lead = {
      id: 'l1', sessionId: 's1', status: 'pending',
      intake: { claimantName: 'A', claimantEmail: 'a@b.c', propertyAddress: 'X', lossType: 'Fire', lossDescription: 'd' },
      signed: false, paid: false, createdAt: 't', updatedAt: 't',
    };
    expect(lead.status).toBe('pending');
  });
});
