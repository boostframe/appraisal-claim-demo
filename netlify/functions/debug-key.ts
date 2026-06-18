import type { Context } from '@netlify/functions';
import crypto from 'node:crypto';
import { loadConfig } from '../../server/config';

// TEMPORARY diagnostic — reports the SHAPE of DS_PRIVATE_KEY (never the key body)
// to debug the RS256 parse failure. Remove after diagnosis.
export default async (_req: Request, _ctx: Context): Promise<Response> => {
  const raw = process.env.DS_PRIVATE_KEY ?? '';
  let normalized = '';
  let normErr = '';
  try { normalized = loadConfig().docusign.privateKey; } catch (e: any) { normErr = e?.message ?? String(e); }

  let parseResult = 'not attempted';
  if (normalized) {
    try { crypto.createPrivateKey(normalized); parseResult = 'OK — valid asymmetric private key'; }
    catch (e: any) { parseResult = 'PARSE FAILED: ' + (e?.message ?? String(e)); }
  }

  const info = {
    codeVersion: 'normalize-v2',
    raw_present: raw.length > 0,
    raw_length: raw.length,
    raw_includesBEGIN: raw.includes('BEGIN'),
    raw_hasLiteralBackslashN: raw.includes('\\n'),
    raw_hasRealNewlines: raw.includes('\n'),
    raw_first15: raw.slice(0, 15),
    normalized_length: normalized.length,
    normalized_startsWithBEGIN: normalized.startsWith('-----BEGIN'),
    normalized_firstLine: normalized.split('\n')[0],
    normalized_lineCount: normalized.split('\n').length,
    normErr,
    parseResult,
  };
  return new Response(JSON.stringify(info, null, 2), { headers: { 'content-type': 'application/json' } });
};
