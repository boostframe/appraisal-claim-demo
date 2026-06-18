// server/templates/__tests__/agreements.test.ts
import { describe, it, expect } from 'vitest';
import { populateAgreements } from '../agreements';

describe('populateAgreements', () => {
  it('produces two named docs with claimant data embedded', () => {
    const docs = populateAgreements({ claimantName: 'Dana Reed', claimantEmail: 'd@x.com', propertyAddress: '12 Oak St', lossType: 'Fire', lossDescription: 'kitchen' });
    expect(docs.map(d => d.name)).toEqual(['Appraisal Agreement', 'Letter of Authorization']);
    const html = Buffer.from(docs[0].htmlBase64, 'base64').toString('utf8');
    expect(html).toContain('Dana Reed');
    expect(html).toContain('12 Oak St');
  });
});
