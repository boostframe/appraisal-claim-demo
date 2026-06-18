// src/components/IntakeForm.tsx
import { useState } from 'react';
import type { IntakeData } from '../../server/domain/types';
export function IntakeForm({ onSubmit, busy }: { onSubmit: (d: IntakeData) => void; busy: boolean }) {
  const [d, setD] = useState<IntakeData>({ claimantName: '', claimantEmail: '', propertyAddress: '', lossType: 'Fire', lossDescription: '' });
  const set = (k: keyof IntakeData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(d); }} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
      <h3>Customer intake — appraisal claim</h3>
      <input required placeholder="Claimant name" value={d.claimantName} onChange={set('claimantName')} />
      <input required type="email" placeholder="Claimant email" value={d.claimantEmail} onChange={set('claimantEmail')} />
      <input required placeholder="Property address" value={d.propertyAddress} onChange={set('propertyAddress')} />
      <select value={d.lossType} onChange={set('lossType')}><option>Fire</option><option>Water</option><option>Wind</option><option>Other</option></select>
      <textarea required placeholder="Describe the loss" value={d.lossDescription} onChange={set('lossDescription')} />
      <button disabled={busy} type="submit">{busy ? 'Preparing documents…' : 'Submit & sign'}</button>
    </form>
  );
}
