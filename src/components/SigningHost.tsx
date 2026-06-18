export function SigningHost({ url, fake, onDevComplete }: { url: string; fake?: boolean; onDevComplete?: () => void }) {
  return (
    <div className="card">
      <p className="eyebrow">Step 2 — Signature</p>
      <h1 className="h1">Sign your Appraisal Agreement &amp; Letter of Authorization</h1>
      <p className="lede">
        Review and sign below. The documents are generated from your intake and completed through
        DocuSign; the signed PDFs return to your case file automatically.
      </p>
      <iframe className="sign__frame" title="DocuSign embedded signing" src={url} />
      <p className="sign__note">Embedded signing — DocuSign developer sandbox.</p>
      {fake && onDevComplete && (
        <div className="sandbox-cue">
          <button className="btn btn--sandbox" onClick={onDevComplete}>✅ Complete signing (sandbox simulation)</button>
          <p>Local sandbox mode — simulates DocuSign Connect marking the envelope complete.</p>
        </div>
      )}
    </div>
  );
}
