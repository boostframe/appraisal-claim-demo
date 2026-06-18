import { getDatabase } from '@netlify/database';
import type { Repository } from './types';
import type { Lead, DemoEvent, Claim, LeadStatus } from '../domain/types';

// Netlify Database (GA) — the connection is configured automatically from the
// managed NETLIFY_DB_URL. Lazily resolve the client so importing this module
// without a database (e.g. the gated test, or fake mode) does not throw.
let _db: any;
function getDb(): any {
  if (!_db) _db = getDatabase();
  return _db;
}

export async function ensureSchema(): Promise<void> {
  const db = getDb();
  await db.sql`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT now())`;
  await db.sql`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, status TEXT NOT NULL,
    intake JSONB NOT NULL, envelope_id TEXT, signed BOOLEAN NOT NULL DEFAULT false,
    paid BOOLEAN NOT NULL DEFAULT false, pdf_blob_key TEXT,
    uploads JSONB NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`;
  await db.sql`CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, type TEXT NOT NULL,
    received_at TEXT NOT NULL, raw JSONB)`;
  await db.sql`CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY, lead_id TEXT NOT NULL UNIQUE, claim_number TEXT NOT NULL,
    status TEXT, pdf_blob_key TEXT, created_at TEXT NOT NULL)`;
}

function rowToLead(r: any): Lead {
  return {
    id: r.id, sessionId: r.session_id, status: r.status as LeadStatus, intake: r.intake,
    envelopeId: r.envelope_id ?? undefined, signed: r.signed, paid: r.paid,
    pdfBlobKey: r.pdf_blob_key ?? undefined,
    uploads: Array.isArray(r.uploads) ? r.uploads : [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export function createPostgresRepository(): Repository {
  return {
    async createSession(id) {
      const db = getDb();
      await db.sql`INSERT INTO sessions (id) VALUES (${id}) ON CONFLICT DO NOTHING`;
    },
    async hasSession(id) {
      const db = getDb();
      const r = await db.sql`SELECT 1 FROM sessions WHERE id = ${id}`;
      return r.length > 0;
    },

    async createLead(l) {
      const db = getDb();
      await db.sql`INSERT INTO leads (id, session_id, status, intake, envelope_id, signed, paid, pdf_blob_key, uploads, created_at, updated_at)
        VALUES (${l.id}, ${l.sessionId}, ${l.status}, ${JSON.stringify(l.intake)}, ${l.envelopeId ?? null}, ${l.signed}, ${l.paid}, ${l.pdfBlobKey ?? null}, ${JSON.stringify(l.uploads ?? [])}, ${l.createdAt}, ${l.updatedAt})`;
    },
    async getLead(id) {
      const db = getDb();
      const r = await db.sql`SELECT * FROM leads WHERE id = ${id}`;
      return r[0] ? rowToLead(r[0]) : null;
    },
    async getLeadByEnvelope(envelopeId) {
      const db = getDb();
      const r = await db.sql`SELECT * FROM leads WHERE envelope_id = ${envelopeId}`;
      return r[0] ? rowToLead(r[0]) : null;
    },
    async updateLead(id, patch) {
      const cur = await this.getLead(id);
      if (!cur) throw new Error(`lead ${id} not found`);
      const n = { ...cur, ...patch };
      const db = getDb();
      await db.sql`UPDATE leads SET status=${n.status}, envelope_id=${n.envelopeId ?? null}, signed=${n.signed}, paid=${n.paid}, pdf_blob_key=${n.pdfBlobKey ?? null}, updated_at=${n.updatedAt} WHERE id=${id}`;
      return n;
    },

    async addUpload(leadId, ref) {
      const db = getDb();
      await db.sql`UPDATE leads SET uploads = uploads || ${JSON.stringify([ref])}::jsonb WHERE id = ${leadId}`;
    },

    async recordEvent(ev: DemoEvent) {
      const db = getDb();
      const r = await db.sql`INSERT INTO processed_events (event_id, lead_id, type, received_at, raw)
        VALUES (${ev.eventId}, ${ev.leadId}, ${ev.type}, ${ev.receivedAt}, ${JSON.stringify(ev.raw)})
        ON CONFLICT (event_id) DO NOTHING RETURNING event_id`;
      return r.length > 0;
    },
    async listEvents(leadId) {
      const db = getDb();
      const r = await db.sql`SELECT * FROM processed_events WHERE lead_id = ${leadId} ORDER BY received_at`;
      return r.map((x: any) => ({ eventId: x.event_id, leadId: x.lead_id, type: x.type, receivedAt: x.received_at, raw: x.raw }));
    },

    async getClaimByLead(leadId) {
      const db = getDb();
      const r = await db.sql`SELECT * FROM claims WHERE lead_id = ${leadId}`;
      return r[0] ? {
        id: r[0].id, leadId: r[0].lead_id, claimNumber: r[0].claim_number,
        status: r[0].status ?? '', pdfBlobKey: r[0].pdf_blob_key ?? undefined, createdAt: r[0].created_at,
      } : null;
    },
    async insertClaim(c: Claim) {
      const db = getDb();
      await db.sql`INSERT INTO claims (id, lead_id, claim_number, status, pdf_blob_key, created_at)
        VALUES (${c.id}, ${c.leadId}, ${c.claimNumber}, ${c.status}, ${c.pdfBlobKey ?? null}, ${c.createdAt})
        ON CONFLICT (lead_id) DO NOTHING`;
      return (await this.getClaimByLead(c.leadId))!;
    },
    async countClaims() {
      const db = getDb();
      const r = await db.sql`SELECT COUNT(*)::int AS n FROM claims`;
      return r[0].n;
    },

    async resetSession(sessionId) {
      const db = getDb();
      await db.sql`DELETE FROM claims WHERE lead_id IN (SELECT id FROM leads WHERE session_id = ${sessionId})`;
      await db.sql`DELETE FROM processed_events WHERE lead_id IN (SELECT id FROM leads WHERE session_id = ${sessionId})`;
      await db.sql`DELETE FROM leads WHERE session_id = ${sessionId}`;
    },
  };
}
