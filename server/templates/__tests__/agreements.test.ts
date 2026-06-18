// server/templates/__tests__/agreements.test.ts
import { describe, it, expect } from 'vitest';
import { populateAgreements } from '../agreements';
import type { IntakeData } from '../../domain/types';

function intake(overrides: Partial<IntakeData> = {}): IntakeData {
  return {
    claimantName: 'Dana Reed', claimantEmail: 'dana@example.com',
    phone: '555-1234', address: '42 Elm St',
    insuranceCarrier: 'Acme Insurance', claimNumber: 'ACM-2024-001',
    adjuster: 'Bob Smith', vehicleYear: '2019', vehicleMake: 'Toyota',
    vehicleModel: 'Camry', vin: '4T1B11HK3KU000001', mileage: '62000',
    settlementOffer: '14500.00', lienholder: 'None',
    gapCoverage: 'No', requestRightToAppraisal: false,
    ...overrides,
  };
}

describe('populateAgreements', () => {
  it('produces two docs when requestRightToAppraisal is false', () => {
    const docs = populateAgreements(intake());
    expect(docs.map(d => d.name)).toEqual(['Appraisal Agreement', 'Letter of Authorization']);
  });

  it('produces three docs when requestRightToAppraisal is true', () => {
    const docs = populateAgreements(intake({ requestRightToAppraisal: true }));
    expect(docs.map(d => d.name)).toEqual([
      'Appraisal Agreement',
      'Letter of Authorization',
      'Right to Appraisal Request',
    ]);
  });

  it('embeds the VIN in the Appraisal Agreement HTML', () => {
    const docs = populateAgreements(intake());
    const html = Buffer.from(docs[0].htmlBase64, 'base64').toString('utf8');
    expect(html).toContain('4T1B11HK3KU000001');
  });

  it('embeds the claimant name in the Appraisal Agreement HTML', () => {
    const docs = populateAgreements(intake());
    const html = Buffer.from(docs[0].htmlBase64, 'base64').toString('utf8');
    expect(html).toContain('Dana Reed');
  });

  it('includes the signature anchor in every doc', () => {
    const docs = populateAgreements(intake({ requestRightToAppraisal: true }));
    for (const d of docs) {
      const html = Buffer.from(d.htmlBase64, 'base64').toString('utf8');
      expect(html).toContain('**signature_1**');
    }
  });

  it('HTML-escapes fields that could contain special characters', () => {
    const docs = populateAgreements(intake({ claimantName: '<script>alert(1)</script>' }));
    const html = Buffer.from(docs[0].htmlBase64, 'base64').toString('utf8');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
