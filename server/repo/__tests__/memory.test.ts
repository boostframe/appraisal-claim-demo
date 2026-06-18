import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepository } from '../memory';
import type { Lead, Claim } from '../../domain/types';

function lead(id: string): Lead {
  return {
    id, sessionId: 's1', status: 'pending',
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
}

function claim(overrides: Partial<Claim> = {}): Claim {
  return { id: 'c1', leadId: 'l1', claimNumber: 'CLM-1040', status: 'New Intake - Paid', createdAt: 't', ...overrides };
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
    const c = claim();
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
    (first as any).type = 'MUTATED';

    const [second] = await repo.listEvents('l1');
    expect(second.type).toBe('payment.succeeded');
  });

  it('finds a lead by envelope id', async () => {
    await repo.createLead({ ...lead('l1'), envelopeId: 'env-7' });
    expect((await repo.getLeadByEnvelope('env-7'))?.id).toBe('l1');
    expect(await repo.getLeadByEnvelope('nope')).toBeNull();
  });

  it('resetSession clears all leads, events, and claims for a session without touching other sessions', async () => {
    const l1 = { ...lead('l1'), sessionId: 's1' };
    await repo.createLead(l1);
    const ev1 = { eventId: 'e1', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't', raw: {} };
    const ev2 = { eventId: 'e2', leadId: 'l1', type: 'payment.succeeded' as const, receivedAt: 't2', raw: {} };
    await repo.recordEvent(ev1);
    await repo.recordEvent(ev2);
    await repo.insertClaim(claim());

    const l2 = { ...lead('l2'), sessionId: 's2' };
    await repo.createLead(l2);

    await repo.resetSession('s1');

    expect(await repo.getLead('l1')).toBeNull();
    expect(await repo.getClaimByLead('l1')).toBeNull();
    expect(await repo.listEvents('l1')).toHaveLength(0);
    expect(await repo.countClaims()).toBe(0);
    expect((await repo.getLead('l2'))?.id).toBe('l2');
  });

  it('addUpload appends uploads and getLead returns all of them', async () => {
    await repo.createLead(lead('l1'));

    await repo.addUpload('l1', { category: 'vehicle_photo', key: 'uploads/l1/a.jpg', name: 'front.jpg', size: 10000, contentType: 'image/jpeg' });
    await repo.addUpload('l1', { category: 'valuation_report', key: 'uploads/l1/b.pdf', name: 'report.pdf', size: 55000, contentType: 'application/pdf' });

    const fetched = await repo.getLead('l1');
    expect(fetched?.uploads).toHaveLength(2);
    expect(fetched?.uploads[0].name).toBe('front.jpg');
    expect(fetched?.uploads[1].category).toBe('valuation_report');
  });

  it('addUpload throws when the lead does not exist', async () => {
    await expect(
      repo.addUpload('nonexistent', { category: 'supporting_doc', key: 'k', name: 'n', size: 1, contentType: 'application/pdf' })
    ).rejects.toThrow();
  });

  it('mutating the uploads array returned by getLead does not corrupt the store', async () => {
    await repo.createLead(lead('l1'));
    await repo.addUpload('l1', { category: 'vehicle_photo', key: 'uploads/l1/a.jpg', name: 'a.jpg', size: 1, contentType: 'image/jpeg' });

    const first = await repo.getLead('l1');
    first!.uploads.push({ category: 'supporting_doc', key: 'INJECTED', name: 'x', size: 1, contentType: 'application/pdf' });

    const second = await repo.getLead('l1');
    expect(second?.uploads).toHaveLength(1);
    expect(second?.uploads[0].key).toBe('uploads/l1/a.jpg');
  });
});
