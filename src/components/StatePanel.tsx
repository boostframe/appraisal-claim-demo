import { useEffect, useState } from 'react';
import * as api from '../api';
import type { StateResponse } from '../types';

const STAGES = [
  { key: 'pending', label: 'Submitted', meta: 'Intake received' },
  { key: 'signed', label: 'Signed', meta: 'Agreements completed' },
  { key: 'paid', label: 'Paid', meta: 'Payment received' },
  { key: 'claimed', label: 'Claim opened', meta: 'New Intake - Paid' },
] as const;

export function StatePanel({ leadId, onReset }: { leadId: string; onReset: () => void }) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function refresh() {
    try { setState(await api.getState(leadId)); } catch { /* keep last good state, retry next tick */ }
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 1500); return () => clearInterval(t); }, [leadId]);
  function note(s: string) { setLog(l => [s, ...l].slice(0, 6)); }

  const lead = state?.lead;
  const claimed = !!state?.claim;
  const done = (k: string) =>
    k === 'pending' ? true : k === 'signed' ? !!lead?.signed : k === 'paid' ? !!lead?.paid : claimed;
  const currentIdx = STAGES.findIndex(s => !done(s.key));

  return (
    <aside className="rail">
      <div className="rail-card">
        <div className="rail-head">
          <h3>Case file</h3>
          <span className="ref">{state?.claim?.claimNumber ?? `lead ${leadId.slice(-6)}`}</span>
        </div>

        <div className="tl">
          {STAGES.map((s, i) => (
            <div key={s.key} className={'tl__node' + (done(s.key) ? ' tl__node--done' : i === currentIdx ? ' tl__node--current' : '')}>
              <div className="tl__dot">{done(s.key) ? '✓' : ''}</div>
              <div>
                <div className="tl__label">{s.label}</div>
                <div className="tl__meta">{done(s.key) ? s.meta : '—'}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flags">
          <div className={'flag' + (lead?.signed ? ' flag--on' : '')}>signed<b>{String(!!lead?.signed)}</b></div>
          <div className={'flag' + (lead?.paid ? ' flag--on' : '')}>paid<b>{String(!!lead?.paid)}</b></div>
        </div>

        {state?.claim ? (
          <div className="result result--claim">
            <div className="result__title">Claim {state.claim.claimNumber} created.</div>
            <div className="result__sub"><a href={state.claim.pdfUrl} target="_blank" rel="noreferrer">Download signed PDF →</a></div>
            <span className="status-chip">{state.claim.status}</span>
          </div>
        ) : (
          <div className="result result--pending">
            <div className="result__title">No claim yet — needs both signature and payment.</div>
            <div className="result__sub">The claim opens only once both events have landed.</div>
          </div>
        )}

        {state && state.uploads.length > 0 && (
          <div className="attach">
            <div className="attach__h">Attached files</div>
            {state.uploads.map((u, i) => (
              <div key={i} className="attach__item">
                <span className="attach__cat">{u.category.replace(/_/g, ' ')}</span>
                <span>{u.name}</span>
                <a href={u.url} target="_blank" rel="noreferrer">view</a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rail-card">
        <div className="rail-section-title">Try to break the gating</div>
        <div className="btn-row">
          <button className="btn btn--ghost" onClick={async () => { const r = await api.simulatePayment(leadId); note(`payment ${r.duplicate ? '(duplicate ignored)' : 'recorded'} → claimed: ${r.claimed}`); refresh(); }}>Simulate payment succeeded</button>
          <button className="btn btn--ghost" onClick={async () => { const r = await api.replayEvent(leadId); note(`replayed ${r.replayed ?? 'nothing'} → ${r.duplicate ? 'duplicate ignored' : 'processed'}`); refresh(); }}>Replay last event</button>
          <button className="btn btn--ghost" onClick={async () => { await api.reset(); setLog([]); onReset(); }}>Reset session</button>
        </div>
      </div>

      <div className="rail-card">
        <div className="rail-section-title">Event ledger</div>
        <div className="ledger">
          {(!state || (state.events.length === 0 && log.length === 0)) && <div className="ledger__empty">No events yet.</div>}
          {state?.events.map(e => (
            <div key={e.eventId} className="ledger__row">
              <span className="ledger__type">{e.type}</span>
              <span className="ledger__id">{e.eventId}</span>
            </div>
          ))}
          {log.map((l, i) => (
            <div key={`n${i}`} className="ledger__row">
              <span className="ledger__note">»</span>
              <span className="ledger__id">{l}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
