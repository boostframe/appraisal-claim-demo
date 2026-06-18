import type { Context } from '@netlify/functions';
import { getRepo, getBlobs, initStore } from '../../server/wiring';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const u = new URL(req.url);
  const leadId = u.searchParams.get('leadId');
  const key = u.searchParams.get('key');
  if (!leadId || !key) return new Response('bad request', { status: 400 });
  const lead = await getRepo().getLead(leadId);
  const ref = lead?.uploads.find(x => x.key === key); // only serve keys that belong to this lead
  if (!ref) return new Response('not found', { status: 404 });
  const bytes = await getBlobs().get(key);
  if (!bytes) return new Response('not found', { status: 404 });
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, { headers: { 'content-type': ref.contentType, 'content-disposition': `inline; filename="${ref.name}"` } });
};
