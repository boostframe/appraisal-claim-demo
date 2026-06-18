// server/docusign/real.ts
import docusign from 'docusign-esign';
import type { DocuSignClient } from './types';

export interface DocuSignConfig {
  basePath: string;          // https://demo.docusign.net/restapi
  oauthBasePath: string;     // account-d.docusign.com
  integrationKey: string;
  userId: string;            // API username (GUID)
  accountId: string;
  privateKey: string;        // RSA private key PEM
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authedApi(cfg: DocuSignConfig): Promise<any> {
  const api = new docusign.ApiClient({ basePath: cfg.basePath, oAuthBasePath: cfg.oauthBasePath });
  const token = await api.requestJWTUserToken(
    cfg.integrationKey, cfg.userId, ['signature', 'impersonation'],
    Buffer.from(cfg.privateKey), 3600,
  );
  api.addDefaultHeader('Authorization', `Bearer ${token.body.access_token}`);
  return api;
}

export function createRealDocuSign(cfg: DocuSignConfig): DocuSignClient {
  return {
    async createEnvelope({ lead, docs, signerName, signerEmail }) {
      const api = await authedApi(cfg);
      const envApi = new docusign.EnvelopesApi(api);
      const documents = docs.map((d, idx) => ({
        documentBase64: d.htmlBase64, name: d.name, fileExtension: 'html', documentId: String(idx + 1),
      }));
      const signHere = docusign.SignHere.constructFromObject({ anchorString: '**signature_1**', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' });
      const signer = docusign.Signer.constructFromObject({
        email: signerEmail, name: signerName, recipientId: '1', routingOrder: '1',
        clientUserId: lead.id, // makes this an embedded (captive) recipient
        tabs: docusign.Tabs.constructFromObject({ signHereTabs: [signHere] }),
      });
      const envDef = docusign.EnvelopeDefinition.constructFromObject({
        emailSubject: 'Please sign your appraisal claim documents',
        documents, recipients: docusign.Recipients.constructFromObject({ signers: [signer] }), status: 'sent',
      });
      const result = await envApi.createEnvelope(cfg.accountId, { envelopeDefinition: envDef });
      return { envelopeId: result.envelopeId! };
    },

    async createRecipientView({ envelopeId, lead, returnUrl, signerName, signerEmail }) {
      const api = await authedApi(cfg);
      const envApi = new docusign.EnvelopesApi(api);
      const viewRequest = docusign.RecipientViewRequest.constructFromObject({
        returnUrl, authenticationMethod: 'none',
        email: signerEmail, userName: signerName, clientUserId: lead.id, recipientId: '1',
      });
      const result = await envApi.createRecipientView(cfg.accountId, envelopeId, { recipientViewRequest: viewRequest });
      return { url: result.url! };
    },

    async getCompletedPdf(envelopeId) {
      const api = await authedApi(cfg);
      const envApi = new docusign.EnvelopesApi(api);
      // 'combined' returns all documents merged into one PDF (string of binary)
      const result: string = await envApi.getDocument(cfg.accountId, envelopeId, 'combined');
      return new Uint8Array(Buffer.from(result, 'binary'));
    },
  };
}
