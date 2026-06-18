import { useState } from 'react';
import * as api from '../api';

export function Splash({ onEnter }: { onEnter: (passcode: string) => void }) {
  const [pc, setPc] = useState(new URLSearchParams(location.search).get('key') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function enter() {
    if (!pc.trim()) { setError('Enter your access code.'); return; }
    setBusy(true);
    setError('');
    try {
      const ok = await api.verifyPasscode(pc);
      if (ok) onEnter(pc);
      else setError('Incorrect access code.');
    } catch {
      setError('Could not verify the code — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="splash">
      <div className="splash-card">
        <div className="brand">
          <div className="brand__mark">PA</div>
          <div className="brand__text">
            <strong>Vehicle Claims Portal</strong>
            <span>Client onboarding portal</span>
          </div>
        </div>
        <h1>Appraisal Claim Demo</h1>
        <p>Enter the access code from your invitation link to begin.</p>
        <input
          className="control"
          value={pc}
          onChange={e => setPc(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') enter(); }}
          placeholder="Access code"
          aria-label="Access code"
          disabled={busy}
        />
        {error && <p className="splash-error">{error}</p>}
        <button className="btn btn--primary btn--block" onClick={enter} disabled={busy}>
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
