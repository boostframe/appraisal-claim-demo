import type { DocuSignConfig } from './docusign/real';

export interface AppConfig {
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
  // base64-encoded PEM (no header present) → decode
  if (k && !k.includes('BEGIN')) {
    try { k = Buffer.from(k, 'base64').toString('utf8'); } catch { /* not base64 — use as-is */ }
  }
  k = k.replace(/\\n/g, '\n');
  // Reconstruct a well-formed PEM even if env-var storage flattened the newlines
  // into spaces (or removed them): extract header label + base64 body, strip all
  // non-base64 chars, and re-wrap the body at 64 columns.
  const m = k.match(/-----BEGIN ([A-Z0-9 ]+?)-----([\s\S]*?)-----END \1-----/);
  if (m) {
    const label = m[1].trim();
    const body = m[2].replace(/[^A-Za-z0-9+/=]/g, '');
    const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body;
    return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
  }
  return k.trim() ? k.trim() + '\n' : '';
}

export function loadConfig(): AppConfig {
  return {
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
