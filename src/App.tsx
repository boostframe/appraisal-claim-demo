import { useEffect, useState } from 'react';
import { IntakeForm, type PickedFile } from './components/IntakeForm';
import { SigningHost } from './components/SigningHost';
import { StatePanel } from './components/StatePanel';
import * as api from './api';
import type { IntakeData } from '../server/domain/types';

export function App() {
  const [leadId, setLeadId] = useState<string | null>(localStorage.getItem('leadId'));
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [fake, setFake] = useState(false);
  const [busy, setBusy] = useState(false);

  // When signing finishes, DocuSign loads our returnUrl (?signed=1) INTO the signing iframe,
  // which would otherwise re-render the whole app inside that little frame. Detect that case.
  const isSigningReturn = window.self !== window.top &&
    new URLSearchParams(window.location.search).has('signed');

  useEffect(() => { if (leadId) localStorage.setItem('leadId', leadId); }, [leadId]);

  // Parent window: when the framed return posts back, close the signing iframe and advance.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'signing-complete') setSigningUrl(null);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Framed return: tell the parent we're done instead of rendering the app inside the iframe.
  useEffect(() => {
    if (isSigningReturn) window.parent.postMessage({ type: 'signing-complete' }, window.location.origin);
  }, [isSigningReturn]);

  async function submit(d: IntakeData, files: PickedFile[]) {
    setBusy(true);
    try {
      const r = await api.createLead(d);
      await Promise.all(files.map(f => api.uploadFile(r.leadId, f.category, f.file).catch(() => null)));
      setLeadId(r.leadId);
      setSigningUrl(r.signingUrl);
      setFake(r.fake);
    } finally {
      setBusy(false);
    }
  }

  async function devCompleteSigning() {
    if (!leadId) return;
    await api.completeSigningDev(leadId);
    setSigningUrl(null);
  }

  if (isSigningReturn) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', font: '500 15px/1.5 system-ui, sans-serif', color: '#33415a' }}>
        Signing complete. Returning to your application…
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark">VC</div>
          <div className="brand__text">
            <strong>Vehicle Claims Portal</strong>
            <span>Client onboarding portal</span>
          </div>
        </div>
        <span className="badge"><span className="badge__dot" />TEST MODE — DocuSign Sandbox / simulated payment</span>
      </header>

      <div className="shell">
        <div className="grid">
          <main>
            {!leadId && <IntakeForm onSubmit={submit} busy={busy} />}
            {leadId && signingUrl && <SigningHost url={signingUrl} fake={fake} onDevComplete={devCompleteSigning} />}
            {leadId && !signingUrl && (
              <div className="card">
                <p className="eyebrow">Your application</p>
                <h1 className="h1">Track your claim in the case file</h1>
                <p className="lede">
                  The case file on the right shows your live status. Your claim opens automatically
                  once your documents are signed and payment is received — use the controls there to
                  continue. If you didn't finish signing, reopen the signing step from your invitation link.
                </p>
              </div>
            )}
          </main>
          {leadId && (
            <StatePanel
              leadId={leadId}
              onReset={() => { localStorage.removeItem('leadId'); setLeadId(null); setSigningUrl(null); }}
            />
          )}
        </div>
      </div>
    </>
  );
}
