// server/domain/__tests__/handlers.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepository } from '../../repo/memory';
import { handleEnvelopeCompleted, handlePaymentSucceeded } from '../handlers';
import type { Lead, Deps } from '../types';

function makeDeps(): Deps {
  let n = 0;
  return { genId: () => `id-${++n}`, now: () => '2026-06-17T00:00:00Z' };
}
function lead(p: Partial<Lead> = {}): Lead {
  return {
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
    signed: false, paid: false, envelopeId: 'env-1', createdAt: 't', updatedAt: 't', ...p,
  };
}
const fakeFetchPdf = async (_env: string) => ({ blobKey: 'pdf/l1' });

describe('event handlers', () => {
  let repo: MemoryRepository; let deps: Deps;
  beforeEach(async () => { repo = new MemoryRepository(); deps = makeDeps(); await repo.createLead(lead()); });

  it('signature alone creates no claim, stores pdf, flips signed', async () => {
    const r = await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, fakeFetchPdf);
    expect(r.claim).toBeNull();
    const l = await repo.getLead('l1');
    expect(l?.signed).toBe(true);
    expect(l?.pdfBlobKey).toBe('pdf/l1');
    expect(await repo.countClaims()).toBe(0);
  });

  it('payment alone creates no claim, flips paid', async () => {
    const r = await handlePaymentSucceeded({ leadId: 'l1', eventId: 'pay-1', raw: {} }, repo, deps);
    expect(r.claim).toBeNull();
    expect((await repo.getLead('l1'))?.paid).toBe(true);
    expect(await repo.countClaims()).toBe(0);
  });

  it('sign then pay creates exactly one claim', async () => {
    await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, fakeFetchPdf);
    const r = await handlePaymentSucceeded({ leadId: 'l1', eventId: 'pay-1', raw: {} }, repo, deps);
    expect(r.claim?.claimNumber).toBe('CLM-1040');
    expect(await repo.countClaims()).toBe(1);
  });

  it('pay then sign creates exactly one claim (order independent)', async () => {
    await handlePaymentSucceeded({ leadId: 'l1', eventId: 'pay-1', raw: {} }, repo, deps);
    const r = await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, fakeFetchPdf);
    expect(r.claim?.claimNumber).toBe('CLM-1040');
    expect(await repo.countClaims()).toBe(1);
  });

  it('replaying the payment event is a harmless no-op', async () => {
    await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, fakeFetchPdf);
    const first = await handlePaymentSucceeded({ leadId: 'l1', eventId: 'pay-1', raw: {} }, repo, deps);
    const replay = await handlePaymentSucceeded({ leadId: 'l1', eventId: 'pay-1', raw: {} }, repo, deps);
    expect(first.duplicate).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(replay.claim?.id).toBe(first.claim?.id);
    expect(await repo.countClaims()).toBe(1);
  });

  it('replaying the signature event does not re-fetch or duplicate', async () => {
    let calls = 0;
    const counting = async (_e: string) => { calls++; return { blobKey: 'pdf/l1' }; };
    await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, counting);
    const replay = await handleEnvelopeCompleted({ leadId: 'l1', eventId: 'ds-1', envelopeId: 'env-1', raw: {} }, repo, deps, counting);
    expect(calls).toBe(1);
    expect(replay.duplicate).toBe(true);
  });
});
