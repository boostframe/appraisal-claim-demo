import { useRef, useState } from 'react';
import type { IntakeData } from '../../server/domain/types';

type Category = 'vehicle_photo' | 'valuation_report' | 'supporting_doc';
export type PickedFile = { category: Category; file: File };

const EMPTY: IntakeData = {
  claimantName: '', claimantEmail: '', phone: '', address: '',
  insuranceCarrier: '', claimNumber: '', adjuster: '',
  vehicleYear: '', vehicleMake: '', vehicleModel: '', vin: '', mileage: '',
  settlementOffer: '', lienholder: '', gapCoverage: 'Unknown', requestRightToAppraisal: false,
};

// Obviously-fictional values so a reviewer can run the flow without typing. Emails use
// the reserved example.com domain (never delivers) and phones use the 555 range.
const SAMPLE: IntakeData = {
  claimantName: 'Jordan Avery', claimantEmail: 'jordan.avery@example.com', phone: '(555) 012-3456',
  address: '482 Birchwood Lane, Columbus, OH 43215',
  insuranceCarrier: 'State Farm', claimNumber: 'SF-2026-004417',
  adjuster: 'Pat Morgan, (555) 014-8890, pat.morgan@example.com',
  vehicleYear: '2019', vehicleMake: 'Toyota', vehicleModel: 'Camry', vin: '4T1BF1FK5KU839201', mileage: '84500',
  settlementOffer: '$18,250.00', lienholder: 'None', gapCoverage: 'No', requestRightToAppraisal: false,
};

export function IntakeForm({ onSubmit, busy }: { onSubmit: (d: IntakeData, files: PickedFile[]) => void; busy: boolean }) {
  const [d, setD] = useState<IntakeData>(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [valuation, setValuation] = useState<File[]>([]);
  const [supporting, setSupporting] = useState<File[]>([]);

  const set = (k: keyof IntakeData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setD({ ...d, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const files: PickedFile[] = [
      ...photos.map(file => ({ category: 'vehicle_photo' as Category, file })),
      ...valuation.map(file => ({ category: 'valuation_report' as Category, file })),
      ...supporting.map(file => ({ category: 'supporting_doc' as Category, file })),
    ];
    onSubmit(d, files);
  }

  return (
    <form className="card form" onSubmit={submit}>
      <div>
        <p className="eyebrow">Step 1 — Customer intake</p>
        <h1 className="h1">Start a new appraisal claim</h1>
        <p className="lede">
          Tell us about the vehicle and the insurer's offer. We'll generate your agreements for
          signature, then collect payment — your claim opens only after both are complete.
        </p>
        <button type="button" className="btn btn--ghost" style={{ marginTop: 12 }}
          disabled={busy} onClick={() => setD(SAMPLE)}>
          Fill with sample data
        </button>
      </div>

      <section>
        <p className="section__title">Claimant</p>
        <div className="grid-2">
          <Field label="Full name" req><input className="control" required value={d.claimantName} onChange={set('claimantName')} /></Field>
          <Field label="Email" req><input className="control" type="email" required value={d.claimantEmail} onChange={set('claimantEmail')} /></Field>
          <Field label="Phone" req><input className="control" required value={d.phone} onChange={set('phone')} /></Field>
          <Field label="Mailing address" req wide><input className="control" required value={d.address} onChange={set('address')} /></Field>
        </div>
      </section>

      <section>
        <p className="section__title">Insurance</p>
        <div className="grid-2">
          <Field label="Insurance carrier" req><input className="control" required value={d.insuranceCarrier} onChange={set('insuranceCarrier')} /></Field>
          <Field label="Claim number" req><input className="control" required value={d.claimNumber} onChange={set('claimNumber')} /></Field>
          <Field label="Adjuster (name & contact)" wide><input className="control" value={d.adjuster} onChange={set('adjuster')} /></Field>
        </div>
      </section>

      <section>
        <p className="section__title">Vehicle</p>
        <div className="grid-2">
          <Field label="Year" req><input className="control" required value={d.vehicleYear} onChange={set('vehicleYear')} /></Field>
          <Field label="Make" req><input className="control" required value={d.vehicleMake} onChange={set('vehicleMake')} /></Field>
          <Field label="Model" req><input className="control" required value={d.vehicleModel} onChange={set('vehicleModel')} /></Field>
          <Field label="Mileage"><input className="control" inputMode="numeric" value={d.mileage} onChange={set('mileage')} /></Field>
          <Field label="VIN" req wide><input className="control" required value={d.vin} onChange={set('vin')} /></Field>
        </div>
      </section>

      <section>
        <p className="section__title">Settlement & coverage</p>
        <div className="grid-2">
          <Field label="Settlement offer"><input className="control" placeholder="$0.00" value={d.settlementOffer} onChange={set('settlementOffer')} /></Field>
          <Field label="Lienholder"><input className="control" placeholder="None" value={d.lienholder} onChange={set('lienholder')} /></Field>
          <Field label="GAP coverage">
            <select className="control" value={d.gapCoverage} onChange={set('gapCoverage')}>
              <option>Unknown</option><option>Yes</option><option>No</option>
            </select>
          </Field>
        </div>
        <div className="check" style={{ marginTop: 14 }}>
          <input id="rta" type="checkbox" checked={d.requestRightToAppraisal}
            onChange={e => setD({ ...d, requestRightToAppraisal: e.target.checked })} />
          <label htmlFor="rta">Request Right to Appraisal
            <small>Adds a Right to Appraisal Request to your signing packet.</small>
          </label>
        </div>
      </section>

      <section>
        <p className="section__title">Documents</p>
        <div className="grid-2">
          <Upload label="Vehicle photos" accept="image/*" multiple files={photos} onChange={setPhotos} />
          <Upload label="Insurance valuation report" accept="image/*,application/pdf" files={valuation} onChange={setValuation} />
          <Upload label="Supporting documents" accept="image/*,application/pdf" multiple wide files={supporting} onChange={setSupporting} />
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Images or PDF, up to 4&nbsp;MB each in this demo.</p>
      </section>

      <button className="btn btn--primary" disabled={busy} type="submit">
        {busy ? 'Preparing documents…' : 'Submit & sign'}
      </button>
    </form>
  );
}

function Field({ label, req, wide, children }: { label: string; req?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={'field' + (wide ? ' field--wide' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
    </div>
  );
}

function Upload({ label, accept, multiple, wide, files, onChange }: {
  label: string; accept: string; multiple?: boolean; wide?: boolean; files: File[]; onChange: (f: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={'field' + (wide ? ' field--wide' : '')}>
      <label>{label}</label>
      <div className="upload">
        <label className="upload__drop">
          <input ref={ref} type="file" accept={accept} multiple={multiple}
            onChange={e => {
              const picked = Array.from(e.target.files ?? []);
              onChange(multiple ? [...files, ...picked] : picked);
            }} />
          ⬆ Choose file{multiple ? 's' : ''}
        </label>
        {files.length > 0 && (
          <ul className="filelist">
            {files.map((f, i) => <li key={i} className="file-chip"><span>{f.name}</span></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
