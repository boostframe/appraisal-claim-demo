// scripts/ds-spike.ts  (run manually, not in CI)
import { createRealDocuSign } from '../server/docusign/real';
import { populateAgreements } from '../server/templates/agreements';
import { loadConfig } from '../server/config';

const cfg = loadConfig();
const ds = createRealDocuSign(cfg.docusign);
const lead = { id: 'spike-lead', sessionId: 's', status: 'pending' as const,
  intake: { claimantName: 'Dana Reed', claimantEmail: cfg.docusign.spikeSignerEmail, propertyAddress: '12 Oak St', lossType: 'Fire', lossDescription: 'kitchen' },
  signed: false, paid: false, createdAt: 't', updatedAt: 't' };

const { envelopeId } = await ds.createEnvelope({ lead, docs: populateAgreements(lead.intake), signerName: 'Dana Reed', signerEmail: cfg.docusign.spikeSignerEmail });
console.log('envelopeId', envelopeId);
const { url } = await ds.createRecipientView({ envelopeId, lead, returnUrl: 'https://example.com/return', signerName: 'Dana Reed', signerEmail: cfg.docusign.spikeSignerEmail });
console.log('OPEN THIS TO SIGN:', url);
