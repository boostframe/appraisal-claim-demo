// src/components/StatePanel.tsx
import { useEffect, useState } from 'react';
import * as api from '../api';
import type { StateResponse } from '../types';

const STAGES = ['pending', 'signed', 'paid', 'claimed'] as const;

export function StatePanel({ leadId, onReset }: { leadId: string; onReset: () => void }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function refresh() { setState(await api.getState(leadId)); }
  useEffect(() => { refresh(); const t = setInterval(refresh, 1500); return () => clearInterval(t); }, [leadId]);

  function note(s: string) { setLog(l => [s, ...l].slice(0, 8)); }

  const lead = state?.lead;
  const reached = (stage: string) => {
    if (!lead) return false;
    const order = ['pending', 'signed', 'paid', 'claimed'];
    const claimed = !!state?.claim;
    const cur = claimed ? 'claimed' : (lead.paid && lead.signed ? 'claimed' : lead.signed ? 'signed' : lead.paid ? 'paid' : 'pending');
    return order.indexOf(stage) <= order.indexOf(cur);
  };

  return (
    <aside style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <h3>Live state</h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {STAGES.map(s => (
          <span key={s} style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12, background: reached(s) ? '#16a34a' : '#e5e7eb', color: reached(s) ? 'white' : '#555' }}>{s}</span>
        ))}
      </div>
      <p style={{ fontSize: 13 }}>signed: <b>{String(!!lead?.signed)}</b> · paid: <b>{String(!!lead?.paid)}</b></p>
      {state?.claim
        ? <p style={{ color: '#16a34a' }}><b>Claim {state.claim.claimNumber} created.</b> <a href={state.claim.pdfUrl} target="_blank" rel="noreferrer">Download signed PDF</a></p>
        : <p style={{ color: '#b45309' }}>No claim yet — needs both signature and payment.</p>}

      <h4>Try to break the gating</h4>
      <div style={{ display: 'grid', gap: 6 }}>
        <button onClick={async () => { const r = await api.simulatePayment(leadId); note(`payment ${r.duplicate ? '(duplicate ignored)' : 'recorded'} → claimed: ${r.claimed}`); refresh(); }}>Simulate payment succeeded</button>
        <button onClick={async () => { const r = await api.replayEvent(leadId); note(`replayed ${r.replayed ?? 'nothing'} → ${r.duplicate ? 'duplicate ignored' : 'processed'}`); refresh(); }}>Replay last event</button>
        <button onClick={async () => { await api.reset(); setLog([]); onReset(); }}>Reset session</button>
      </div>

      <h4>Event log</h4>
      <ul style={{ fontSize: 12, paddingLeft: 16 }}>
        {state?.events.map(e => <li key={e.eventId}>{e.type} — {e.eventId}</li>)}
        {log.map((l, i) => <li key={`note-${i}`} style={{ color: '#2563eb' }}>{l}</li>)}
      </ul>
    </aside>
  );
}
