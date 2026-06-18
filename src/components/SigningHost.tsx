// src/components/SigningHost.tsx
export function SigningHost({ url }: { url: string }) {
  return (
    <div>
      <h3>Sign your Appraisal Agreement & Letter of Authorization</h3>
      <iframe title="DocuSign embedded signing" src={url} style={{ width: '100%', height: 620, border: '1px solid #ccc' }} />
      <p style={{ fontSize: 12, color: '#666' }}>Real DocuSign developer sandbox.</p>
    </div>
  );
}
