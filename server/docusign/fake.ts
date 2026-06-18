// server/docusign/fake.ts
import type { DocuSignClient } from './types';

let seq = 0;
export class FakeDocuSign implements DocuSignClient {
  async createEnvelope() { return { envelopeId: `fake-env-${++seq}` }; }
  async createRecipientView(i: { envelopeId: string; returnUrl: string }) {
    return { url: `${i.returnUrl}?envelopeId=${i.envelopeId}&event=signing_complete` };
  }
  async getCompletedPdf() { return new TextEncoder().encode('%PDF-1.4 fake completed document'); }
}
