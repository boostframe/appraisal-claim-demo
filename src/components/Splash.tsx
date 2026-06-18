import { useState } from 'react';

export function Splash({ onEnter }: { onEnter: (passcode: string) => void }) {
  const [pc, setPc] = useState(new URLSearchParams(location.search).get('key') ?? '');
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
          onKeyDown={e => { if (e.key === 'Enter') onEnter(pc); }}
          placeholder="Access code"
          aria-label="Access code"
        />
        <button className="btn btn--primary btn--block" onClick={() => onEnter(pc)}>Continue</button>
      </div>
    </div>
  );
}
