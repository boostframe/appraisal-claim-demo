// server/docusign/types.ts
import type { Lead } from '../domain/types';
import type { PopulatedDoc } from '../templates/agreements';

export interface DocuSignClient {
  createEnvelope(i: { lead: Lead; docs: PopulatedDoc[]; signerName: string; signerEmail: string }): Promise<{ envelopeId: string }>;
  createRecipientView(i: { envelopeId: string; lead: Lead; returnUrl: string; signerName: string; signerEmail: string }): Promise<{ url: string }>;
  getCompletedPdf(envelopeId: string): Promise<Uint8Array>;
}
