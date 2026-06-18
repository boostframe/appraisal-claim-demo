import type { DocuSignConfig } from './docusign/real';

export interface AppConfig {
  passcode: string;
  appUrl: string;
  docusign: DocuSignConfig & { spikeSignerEmail: string };
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    if (process.env.DEMO_FAKE === '1') return ''; // DocuSign creds unused in fake mode (getDs returns FakeDocuSign)
    throw new Error(`missing env ${name}`);
  }
  return v;
}

// The RSA private key is the one value that env-var systems love to mangle (lost
// newlines, added quotes). Accept it in any of three forms so it survives:
//   1) base64-encoded PEM (recommended — no newlines to lose)
//   2) single-line PEM with literal "\n" separators
//   3) raw multi-line PEM
function normalizePrivateKey(raw: string): string {
  let k = raw.trim().replace(/^["']|["']$/g, '').trim();
  if (k && !k.includes('BEGIN')) {
    try { k = Buffer.from(k, 'base64').toString('utf8'); } catch { /* not base64 — use as-is */ }
  }
  k = k.replace(/\\n/g, '\n').trim();
  return k ? k + '\n' : '';
}

export function loadConfig(): AppConfig {
  return {
    passcode: process.env.DEMO_PASSCODE ?? 'appraise',
    appUrl: process.env.APP_URL ?? 'http://localhost:8888',
    docusign: {
      basePath: process.env.DS_BASE_PATH ?? 'https://demo.docusign.net/restapi',
      oauthBasePath: process.env.DS_OAUTH_BASE_PATH ?? 'account-d.docusign.com',
      integrationKey: req('DS_INTEGRATION_KEY'),
      userId: req('DS_USER_ID'),
      accountId: req('DS_ACCOUNT_ID'),
      privateKey: normalizePrivateKey(req('DS_PRIVATE_KEY')),
      spikeSignerEmail: process.env.DS_SPIKE_EMAIL ?? 'demo@example.com',
    },
  };
}
