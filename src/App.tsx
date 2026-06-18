// src/App.tsx
import { useEffect, useState } from 'react';
import { Splash } from './components/Splash';
import { IntakeForm } from './components/IntakeForm';
import { SigningHost } from './components/SigningHost';
import { StatePanel } from './components/StatePanel';
import * as api from './api';
import type { IntakeData } from '../server/domain/types';

const Banner = () => <div style={{ background: '#fde68a', padding: 8, textAlign: 'center', fontSize: 13 }}>TEST MODE — DocuSign Sandbox / simulated payment</div>;

export function App() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(localStorage.getItem('leadId'));
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (leadId) localStorage.setItem('leadId', leadId); }, [leadId]);

  async function submit(d: IntakeData) {
    setBusy(true);
    try { const r = await api.createLead(passcode!, d); setLeadId(r.leadId); setSigningUrl(r.signingUrl); }
    finally { setBusy(false); }
  }

  if (!passcode) return <Splash onEnter={setPasscode} />;
  return (
    <div style={{ fontFamily: 'system-ui' }}>
      <Banner />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, padding: 24 }}>
        <div>
          {!leadId && <IntakeForm onSubmit={submit} busy={busy} />}
          {leadId && signingUrl && <SigningHost url={signingUrl} />}
          {leadId && !signingUrl && <p>Signing complete — use the panel to simulate payment.</p>}
        </div>
        {leadId && <StatePanel leadId={leadId} onReset={() => { localStorage.removeItem('leadId'); setLeadId(null); setSigningUrl(null); }} />}
      </div>
    </div>
  );
}
