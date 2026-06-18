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
      privateKey: req('DS_PRIVATE_KEY').replace(/\\n/g, '\n'),
      spikeSignerEmail: process.env.DS_SPIKE_EMAIL ?? 'demo@example.com',
    },
  };
}
