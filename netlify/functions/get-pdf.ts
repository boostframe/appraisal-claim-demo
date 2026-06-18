import type { Context } from '@netlify/functions';
import { getRepo, getBlobs, initStore } from '../../server/wiring';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const leadId = new URL(req.url).searchParams.get('leadId');
  if (!leadId) return new Response('bad request', { status: 400 });
  const lead = await getRepo().getLead(leadId);
  if (!lead?.pdfBlobKey) return new Response('no document yet', { status: 404 });
  const bytes = await getBlobs().get(lead.pdfBlobKey);
  if (!bytes) return new Response('not found', { status: 404 });
  const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Response(body, { headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="claim-${leadId}.pdf"` } });
};
