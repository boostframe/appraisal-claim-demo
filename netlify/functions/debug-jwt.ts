import type { Context } from '@netlify/functions';
import docusign from 'docusign-esign';
import { loadConfig } from '../../server/config';

// TEMPORARY diagnostic — attempts only the DocuSign JWT token request and returns
// DocuSign's actual error body (e.g. consent_required). Never returns the key.
function j(o: unknown) { return new Response(JSON.stringify(o, null, 2), { headers: { 'content-type': 'application/json' } }); }

export default async (_req: Request, _ctx: Context): Promise<Response> => {
  let cfg: any;
  try { cfg = loadConfig().docusign; } catch (e: any) { return j({ configError: e?.message ?? String(e) }); }
  const api = new docusign.ApiClient({ basePath: cfg.basePath, oAuthBasePath: cfg.oauthBasePath });
  try {
    const t: any = await api.requestJWTUserToken(
      cfg.integrationKey, cfg.userId, ['signature', 'impersonation'], Buffer.from(cfg.privateKey), 3600,
    );
    return j({ ok: true, gotToken: !!t?.body?.access_token });
  } catch (e: any) {
    return j({
      ok: false,
      status: e?.response?.status ?? e?.status,
      docusignError: e?.response?.body ?? e?.response?.text ?? e?.response?.data ?? e?.message,
      oauthBasePath: cfg.oauthBasePath,
      integrationKeyLen: cfg.integrationKey?.length,
      userIdLen: cfg.userId?.length,
      accountIdLen: cfg.accountId?.length,
      spikeEmail: cfg.spikeSignerEmail,
    });
  }
};
