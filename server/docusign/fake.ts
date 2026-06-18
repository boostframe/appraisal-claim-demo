// server/docusign/fake.ts
import type { DocuSignClient } from './types';
import type { Lead } from '../domain/types';
import type { PopulatedDoc } from '../templates/agreements';

let seq = 0;
export class FakeDocuSign implements DocuSignClient {
  async createEnvelope(_i: { lead: Lead; docs: PopulatedDoc[]; signerName: string; signerEmail: string }) {
    return { envelopeId: `fake-env-${++seq}` };
  }
  async createRecipientView(i: { envelopeId: string; lead: Lead; returnUrl: string; signerName: string; signerEmail: string }) {
    return { url: `${i.returnUrl}?envelopeId=${i.envelopeId}&event=signing_complete` };
  }
  async getCompletedPdf(_envelopeId: string) { return new TextEncoder().encode('%PDF-1.4 fake completed document'); }
}
