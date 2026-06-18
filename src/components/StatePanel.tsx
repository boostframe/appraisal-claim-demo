// src/components/StatePanel.tsx — PLACEHOLDER for Task 12
// Task 12 will replace this with the real state panel implementation.
export function StatePanel({ leadId, onReset }: { leadId: string; onReset: () => void }) {
  return (
    <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 4 }}>
      <p style={{ fontSize: 12, color: '#999' }}>State panel loading… (leadId: {leadId})</p>
      <button onClick={onReset} style={{ fontSize: 12 }}>Reset</button>
    </div>
  );
}
