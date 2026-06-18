// src/components/SigningHost.tsx
export function SigningHost({ url, fake, onDevComplete }: { url: string; fake?: boolean; onDevComplete?: () => void }) {
  return (
    <div>
      <h3>Sign your Appraisal Agreement & Letter of Authorization</h3>
      <iframe title="DocuSign embedded signing" src={url} style={{ width: '100%', height: 620, border: '1px solid #ccc' }} />
      <p style={{ fontSize: 12, color: '#666' }}>Real DocuSign developer sandbox.</p>
      {fake && onDevComplete && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={onDevComplete}
            style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 4, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}
          >
            ✅ Complete signing (sandbox simulation)
          </button>
          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Local fake mode — click to simulate DocuSign Connect completing the envelope.
          </p>
        </div>
      )}
    </div>
  );
}
