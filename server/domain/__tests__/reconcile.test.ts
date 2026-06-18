// server/domain/__tests__/reconcile.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepository } from '../../repo/memory';
import { reconcile, createClaim } from '../reconcile';
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
    signed: false, paid: false, createdAt: 't', updatedAt: 't', ...p,
  };
}

describe('gating', () => {
  let repo: MemoryRepository; let deps: Deps;
  beforeEach(() => { repo = new MemoryRepository(); deps = makeDeps(); });

  it('does NOT create a claim when only signed', async () => {
    await repo.createLead(lead({ signed: true, paid: false }));
    expect(await reconcile('l1', repo, deps)).toBeNull();
    expect(await repo.countClaims()).toBe(0);
  });

  it('does NOT create a claim when only paid', async () => {
    await repo.createLead(lead({ signed: false, paid: true }));
    expect(await reconcile('l1', repo, deps)).toBeNull();
    expect(await repo.countClaims()).toBe(0);
  });

  it('creates exactly one claim when both signed and paid', async () => {
    await repo.createLead(lead({ signed: true, paid: true }));
    const claim = await reconcile('l1', repo, deps);
    expect(claim?.claimNumber).toBe('CLM-1040');
    expect((await repo.getLead('l1'))?.status).toBe('claimed');
    expect(await repo.countClaims()).toBe(1);
  });

  it('created claim has status "New Intake - Paid"', async () => {
    await repo.createLead(lead({ signed: true, paid: true }));
    const claim = await reconcile('l1', repo, deps);
    expect(claim?.status).toBe('New Intake - Paid');
  });

  it('is idempotent: reconciling twice does not duplicate', async () => {
    await repo.createLead(lead({ signed: true, paid: true }));
    const a = await reconcile('l1', repo, deps);
    const b = await reconcile('l1', repo, deps);
    expect(b?.id).toBe(a?.id);
    expect(await repo.countClaims()).toBe(1);
  });

  it('numbers claims sequentially from CLM-1040', async () => {
    await repo.createLead(lead({ id: 'l1', signed: true, paid: true }));
    await repo.createLead(lead({ id: 'l2', signed: true, paid: true }));
    expect((await reconcile('l1', repo, deps))?.claimNumber).toBe('CLM-1040');
    expect((await reconcile('l2', repo, deps))?.claimNumber).toBe('CLM-1041');
  });

  it('createClaim throws if called before both gates pass', async () => {
    await repo.createLead(lead({ signed: true, paid: false }));
    await expect(createClaim('l1', repo, deps)).rejects.toThrow();
  });
});
