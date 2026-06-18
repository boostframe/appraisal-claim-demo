import type { Repository } from './types';
import type { Lead, DemoEvent, Claim } from '../domain/types';

export class MemoryRepository implements Repository {
  private sessions = new Set<string>();
  private leads = new Map<string, Lead>();
  private events = new Map<string, DemoEvent>(); // keyed by eventId
  private claims = new Map<string, Claim>();      // keyed by leadId

  async createSession(id: string) { this.sessions.add(id); }
  async hasSession(id: string) { return this.sessions.has(id); }

  async createLead(l: Lead) { this.leads.set(l.id, { ...l }); }
  async getLead(id: string) { const l = this.leads.get(id); return l ? { ...l } : null; }
  async getLeadByEnvelope(envelopeId: string) {
    for (const l of this.leads.values()) if (l.envelopeId === envelopeId) return { ...l };
    return null;
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const cur = this.leads.get(id);
    if (!cur) throw new Error(`lead ${id} not found`);
    const next = { ...cur, ...patch };
    this.leads.set(id, next);
    return { ...next };
  }

  async recordEvent(ev: DemoEvent) {
    if (this.events.has(ev.eventId)) return false;
    this.events.set(ev.eventId, { ...ev });
    return true;
  }
  async listEvents(leadId: string) {
    return [...this.events.values()].filter(e => e.leadId === leadId).map(e => ({ ...e }));
  }

  async getClaimByLead(leadId: string) { const c = this.claims.get(leadId); return c ? { ...c } : null; }
  async insertClaim(claim: Claim) {
    const existing = this.claims.get(claim.leadId);
    if (existing) return { ...existing };
    this.claims.set(claim.leadId, { ...claim });
    return { ...claim };
  }
  async countClaims() { return this.claims.size; }

  async resetSession(sessionId: string) {
    const leadIds = [...this.leads.entries()]
      .filter(([, l]) => l.sessionId === sessionId)
      .map(([id]) => id);
    for (const id of leadIds) {
      this.leads.delete(id);
      this.claims.delete(id);
    }
    const leadIdSet = new Set(leadIds);
    for (const [eid, e] of [...this.events]) {
      if (leadIdSet.has(e.leadId)) this.events.delete(eid);
    }
  }
}
