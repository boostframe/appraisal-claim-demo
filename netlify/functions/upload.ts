import type { Context } from '@netlify/functions';
import { getRepo, getBlobs, initStore } from '../../server/wiring';
import type { UploadRef } from '../../server/domain/types';

const MAX = 4 * 1024 * 1024; // 4MB demo cap (Netlify sync-function body limit)
const CATS = ['vehicle_photo', 'valuation_report', 'supporting_doc'];
const okType = (t: string) => t.startsWith('image/') || t === 'application/pdf';

export default async (req: Request, _ctx: Context): Promise<Response> => {
  await initStore();
  const form = await req.formData();
  const leadId = String(form.get('leadId') ?? '');
  const category = String(form.get('category') ?? '');
  const file = form.get('file');
  if (!leadId || !(file instanceof File)) return new Response('bad request', { status: 400 });
  if (!CATS.includes(category)) return new Response('bad category', { status: 400 });
  if (!okType(file.type)) return new Response('unsupported file type', { status: 415 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX) return new Response('file too large (4MB max in demo)', { status: 413 });
  const repo = getRepo();
  const lead = await repo.getLead(leadId);
  if (!lead) return new Response('lead not found', { status: 404 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${leadId}/${crypto.randomUUID()}-${safeName}`;
  const contentType = file.type || 'application/octet-stream';
  await getBlobs().put(key, bytes, contentType);
  const ref: UploadRef = { category: category as UploadRef['category'], key, name: file.name, size: bytes.byteLength, contentType };
  await repo.addUpload(leadId, ref);
  return new Response(JSON.stringify({ key, name: ref.name, size: ref.size, category: ref.category }), { headers: { 'content-type': 'application/json' } });
};
