// src/components/Splash.tsx
import { useState } from 'react';
export function Splash({ onEnter }: { onEnter: (passcode: string) => void }) {
  const [pc, setPc] = useState(new URLSearchParams(location.search).get('key') ?? '');
  return (
    <div style={{ maxWidth: 420, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h2>Appraisal Claim Demo</h2>
      <p>Enter the passcode from the share link.</p>
      <input value={pc} onChange={e => setPc(e.target.value)} placeholder="passcode" style={{ padding: 8, width: '100%' }} />
      <button onClick={() => onEnter(pc)} style={{ marginTop: 12, padding: '8px 16px' }}>Enter</button>
    </div>
  );
}
