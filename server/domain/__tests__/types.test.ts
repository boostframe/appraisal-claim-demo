import { describe, it, expect } from 'vitest';
import type { Lead } from '../types';
describe('domain types', () => {
  it('builds a pending lead literal', () => {
    const lead: Lead = {
      id: 'l1', sessionId: 's1', status: 'pending',
      intake: {
        claimantName: 'Dana Reed', claimantEmail: 'dana@example.com',
        phone: '555-1234', address: '42 Elm St',
        insuranceCarrier: 'Acme Insurance', claimNumber: 'ACM-2024-001',
        adjuster: 'Bob Smith', vehicleYear: '2019', vehicleMake: 'Toyota',
        vehicleModel: 'Camry', vin: '4T1B11HK3KU000001', mileage: '62000',
        settlementOffer: '14500.00', lienholder: 'None',
        gapCoverage: 'No', requestRightToAppraisal: false,
      },
      uploads: [],
      signed: false, paid: false, createdAt: 't', updatedAt: 't',
    };
    expect(lead.status).toBe('pending');
  });
});
